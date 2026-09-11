/**
 * Velcora Unified AI Router — High-Availability Dual-Provider System
 * PRIMARY: DeepSeek | FALLBACK: Google Gemini
 */
import { resolveEngineRoute, generateWithRetry, DeepSeekMessage, DeepSeekResult } from './deepSeekService';
import { generateGeminiText, GeminiMessage, GeminiResult, isGeminiTextConfigured, GeminiModelId } from './geminiTextService';

export type ProviderId = 'deepseek' | 'gemini';

export interface NormalizedRequest {
  engineId: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export interface NormalizedResponse {
  success: boolean;
  content: string;
  reasoningContent?: string;
  provider: ProviderId | 'none';
  model: string;
  tokensUsed: number;
  finishReason: string;
  failover: boolean;
  failoverReason?: string;
  retries: number;
  latencyMs: number;
  error?: string;
}

// ─── Provider Health Tracker ─────────────────────────────────────────────────

interface ProviderHealth {
  failures: number;
  lastFailure: number;
  lastSuccess: number;
  cooldownUntil: number;
  isHealthy: boolean;
}

const PROVIDER_COOLDOWN_MS = 60000;
const PROVIDER_FAILURE_THRESHOLD = 3;

const providerHealth: Record<ProviderId, ProviderHealth> = {
  deepseek: { failures: 0, lastFailure: 0, lastSuccess: 0, cooldownUntil: 0, isHealthy: true },
  gemini: { failures: 0, lastFailure: 0, lastSuccess: 0, cooldownUntil: 0, isHealthy: true },
};

function recordProviderSuccess(provider: ProviderId) {
  providerHealth[provider].failures = 0;
  providerHealth[provider].lastSuccess = Date.now();
  providerHealth[provider].isHealthy = true;
  providerHealth[provider].cooldownUntil = 0;
}

function recordProviderFailure(provider: ProviderId) {
  providerHealth[provider].failures++;
  providerHealth[provider].lastFailure = Date.now();
  if (providerHealth[provider].failures >= PROVIDER_FAILURE_THRESHOLD) {
    providerHealth[provider].isHealthy = false;
    providerHealth[provider].cooldownUntil = Date.now() + PROVIDER_COOLDOWN_MS;
  }
}

function isProviderAvailable(provider: ProviderId): boolean {
  const h = providerHealth[provider];
  if (h.isHealthy) return true;
  if (Date.now() > h.cooldownUntil) {
    h.isHealthy = true;
    h.failures = 0;
    return true;
  }
  return false;
}

export function getProviderHealthStatus() {
  return {
    deepseek: { ...providerHealth.deepseek, available: isProviderAvailable('deepseek') },
    gemini: { ...providerHealth.gemini, available: isProviderAvailable('gemini') },
  };
}

// ─── Model Mapping ────────────────────────────────────────────────────────────

const GEMINI_FALLBACK_MODELS: Record<string, GeminiModelId> = {
  NORMAL_CHAT: 'gemini-flash-lite-latest',
  FLASH: 'gemini-3.5-flash',
  OMNI: 'gemini-3.5-flash',
  FINANCIAL_AGENT: 'gemini-3.5-flash',
};

function getEngineKind(engineId: string): string {
  const map: Record<string, string> = {
    chat: 'NORMAL_CHAT', 'velcora-chat': 'NORMAL_CHAT',
    flash: 'FLASH', 'velcora-neural-flash': 'FLASH', 'flash-omni-1': 'FLASH',
    omni: 'OMNI', 'velcora-omni': 'OMNI', 'velcora-brain': 'OMNI',
    axiom: 'FINANCIAL_AGENT', 'velcora-axiom': 'FINANCIAL_AGENT', 'velcora-financial': 'FINANCIAL_AGENT',
    'financial-axiom': 'FINANCIAL_AGENT', 'velcora-fashion-dealer': 'OMNI',
  };
  return map[engineId] || 'NORMAL_CHAT';
}

// ─── DeepSeek Call ───────────────────────────────────────────────────────────

async function callDeepSeek(messages: DeepSeekMessage[], engineId: string, maxTokens: number): Promise<NormalizedResponse> {
  const route = resolveEngineRoute(engineId);
  const startTime = Date.now();
  const result: DeepSeekResult = await generateWithRetry(route, messages, { maxTokens, timeoutMs: 60000, maxRetries: 1 });
  recordProviderSuccess('deepseek');
  return {
    success: true,
    content: result.text,
    reasoningContent: result.reasoningContent,
    provider: 'deepseek',
    model: result.modelUsed,
    tokensUsed: result.tokensUsed,
    finishReason: result.finishReason,
    failover: false,
    retries: 0,
    latencyMs: Date.now() - startTime,
  };
}

// ─── Gemini Fallback Call ────────────────────────────────────────────────────

async function callGemini(messages: GeminiMessage[], engineId: string, maxTokens: number, systemInstruction?: string): Promise<NormalizedResponse> {
  const kind = getEngineKind(engineId);
  const modelId = GEMINI_FALLBACK_MODELS[kind] || 'gemini-flash-lite-latest';
  const startTime = Date.now();
  const result: GeminiResult = await generateGeminiText(modelId, messages, { systemInstruction, maxTokens, timeoutMs: 60000, maxRetries: 1 });
  recordProviderSuccess('gemini');
  return {
    success: true,
    content: result.text,
    provider: 'gemini',
    model: result.modelUsed,
    tokensUsed: result.tokensUsed,
    finishReason: result.finishReason,
    failover: true,
    retries: 0,
    latencyMs: Date.now() - startTime,
  };
}

// ─── Main Router ──────────────────────────────────────────────────────────────

export async function routeAIRequest(req: NormalizedRequest & { userId?: string; requestId?: string; businessId?: string }): Promise<NormalizedResponse> {
  const startTime = Date.now();
  const maxTokens = req.maxTokens || 4096;
  const systemMsg = req.messages.find((m) => m.role === 'system');
  const chatMessages = req.messages.filter((m) => m.role !== 'system');
  const deepSeekMsgs: DeepSeekMessage[] = req.messages as DeepSeekMessage[];
  const geminiMsgs: GeminiMessage[] = chatMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // ── Try DeepSeek (Primary) ──────────────────────────────────────────────────
  const deepSeekAvailable = isProviderAvailable('deepseek');
  if (deepSeekAvailable) {
    try {
      const result = await callDeepSeek(deepSeekMsgs, req.engineId, maxTokens);
      return result;
    } catch (err: any) {
      recordProviderFailure('deepseek');
      const status = err?.status || 0;
      const isProviderError = status === 429 || status >= 500 || status === 408 || err?.isRateLimit || err?.isRetryable;
      const isAuthError = status === 401 || (typeof err?.message === 'string' && err.message.includes('not configured'));
      if (!isProviderError && !isAuthError) {
        // Application error — don't fail over, return clean error
        return { success: false, content: '', provider: 'deepseek', model: '', tokensUsed: 0, finishReason: 'error', failover: false, retries: 0, latencyMs: Date.now() - startTime, error: err?.message || 'Request failed' };
      }
      // Provider error or auth error — fall through to Gemini
      console.log(`[Router] DeepSeek failed (${err?.message || status}). Failing over to Gemini...`);
    }
  } else {
    console.log('[Router] DeepSeek not available — will use Gemini if configured.');
  }

  // ── Try Gemini (Fallback) ───────────────────────────────────────────────────
  const geminiAvailable = isProviderAvailable('gemini') && isGeminiTextConfigured();
  if (geminiAvailable) {
    try {
      const result = await callGemini(geminiMsgs, req.engineId, maxTokens, systemMsg?.content);
      const failoverReason = deepSeekAvailable
        ? 'DeepSeek provider error — auto-failed over to Gemini'
        : 'DeepSeek not configured — using Gemini';
      result.failoverReason = failoverReason;
      return result;
    } catch (err: any) {
      recordProviderFailure('gemini');
      console.log(`[Router] Gemini also failed (${err?.message || 'unknown'}). Returning clean error.`);
      return {
        success: false,
        content: '',
        provider: 'gemini',
        model: '',
        tokensUsed: 0,
        finishReason: 'unavailable',
        failover: true,
        failoverReason: 'Both providers unavailable',
        retries: 0,
        latencyMs: Date.now() - startTime,
        error: 'AI service temporarily unavailable. Please try again shortly.',
      };
    }
  }

  // ── No Provider Available ───────────────────────────────────────────────────
  return {
    success: false,
    content: '',
    provider: 'none',
    model: '',
    tokensUsed: 0,
    finishReason: 'unavailable',
    failover: false,
    retries: 0,
    latencyMs: Date.now() - startTime,
    error: deepSeekAvailable ? 'AI backup provider not configured. Please set GEMINI_API_KEY.' : 'AI service temporarily unavailable. Please try again shortly.',
  };
}
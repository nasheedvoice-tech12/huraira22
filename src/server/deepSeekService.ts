/**
 * Velcora Centralized DeepSeek AI Service
 * Single source of truth for all DeepSeek API calls.
 * SECURITY: API key is server-side only (DEEPSEEK_API_KEY env var).
 */

export type DeepSeekModelId = 'deepseek-v4-flash' | 'deepseek-v4-pro';

export interface DeepSeekModelConfig {
  id: DeepSeekModelId;
  label: string;
  supportsThinking: boolean;
  maxContextTokens: number;
}

export const DEEPSEEK_MODELS: Record<DeepSeekModelId, DeepSeekModelConfig> = {
  'deepseek-v4-flash': { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', supportsThinking: true, maxContextTokens: 128000 },
  'deepseek-v4-pro': { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', supportsThinking: true, maxContextTokens: 128000 },
};

export type VelcoraEngineKind = 'NORMAL_CHAT' | 'FLASH' | 'OMNI' | 'FINANCIAL_AGENT';

export interface EngineRoute {
  model: DeepSeekModelId;
  thinking: boolean;
  reasoningEffort: 'off' | 'low' | 'medium' | 'high';
  temperature: number;
  description: string;
}

export const ENGINE_ROUTES: Record<VelcoraEngineKind, EngineRoute> = {
  NORMAL_CHAT: { model: 'deepseek-v4-flash', thinking: false, reasoningEffort: 'off', temperature: 0.7, description: 'Fast everyday AI.' },
  FLASH: { model: 'deepseek-v4-flash', thinking: true, reasoningEffort: 'medium', temperature: 0.5, description: 'Fast reasoning for business analysis.' },
  OMNI: { model: 'deepseek-v4-pro', thinking: true, reasoningEffort: 'high', temperature: 0.6, description: 'Advanced reasoning for complex business intelligence.' },
  FINANCIAL_AGENT: { model: 'deepseek-v4-pro', thinking: true, reasoningEffort: 'high', temperature: 0.2, description: 'Financial analysis. NEVER invents numbers.' },
};

const UI_ENGINE_MAP: Record<string, VelcoraEngineKind> = {
  chat: 'NORMAL_CHAT', 'velcora-chat': 'NORMAL_CHAT',
  flash: 'FLASH', 'velcora-neural-flash': 'FLASH',
  omni: 'OMNI', 'velcora-omni': 'OMNI',
  axiom: 'FINANCIAL_AGENT', 'velcora-axiom': 'FINANCIAL_AGENT', 'velcora-financial': 'FINANCIAL_AGENT',
  'financial-axiom': 'FINANCIAL_AGENT', 'flash-omni-1': 'FLASH', 'velcora-brain': 'OMNI',
};

export function resolveEngineRoute(uiEngineId: string): EngineRoute {
  const kind = UI_ENGINE_MAP[uiEngineId] || 'NORMAL_CHAT';
  return ENGINE_ROUTES[kind];
}

export function getDeepSeekApiKey(): string | null {
  const key = process.env.DEEPSEEK_API_KEY || '';
  if (!key || typeof key !== 'string' || key.trim() === '' || key.startsWith('ENTER_') || key.length < 10) {
    return null;
  }
  return key.trim();
}

export function isDeepSeekConfigured(): boolean {
  return getDeepSeekApiKey() !== null;
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekResult {
  text: string;
  reasoningContent?: string;
  modelUsed: DeepSeekModelId;
  tokensUsed: number;
  finishReason: string;
}

export class DeepSeekError extends Error {
  status: number;
  isRetryable: boolean;
  isRateLimit: boolean;
  providerCode?: string;
  constructor(message: string, status: number, opts?: { isRetryable?: boolean; isRateLimit?: boolean; providerCode?: string }) {
    super(message);
    this.name = 'DeepSeekError';
    this.status = status;
    this.isRetryable = opts?.isRetryable ?? false;
    this.isRateLimit = opts?.isRateLimit ?? false;
    this.providerCode = opts?.providerCode;
  }
}

function classifyApiError(status: number, errBody: any): DeepSeekError {
  const msg = errBody?.error?.message || `DeepSeek API error (${status})`;
  const code = errBody?.error?.code;
  const isRateLimit = status === 429;
  const isRetryable = isRateLimit || status >= 500 || status === 408;
  return new DeepSeekError(msg, status, { isRetryable, isRateLimit, providerCode: code });
}

const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

async function callDeepSeek(
  route: EngineRoute,
  messages: DeepSeekMessage[],
  opts?: { maxTokens?: number; timeoutMs?: number }
): Promise<DeepSeekResult> {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    throw new DeepSeekError('DEEPSEEK_API_KEY is not configured in environment.', 401, { isRetryable: false });
  }
  const body: any = {
    model: route.model,
    messages,
    temperature: route.temperature,
    max_tokens: opts?.maxTokens || 4096,
    stream: false,
  };
  // DeepSeek API requires `thinking` to be an OBJECT (ThinkingOptions), never a boolean.
  // Only send it when thinking is requested; omit entirely for non-thinking calls
  // (verified live: sending `thinking: false` -> 400 "expected struct ThinkingOptions").
  if (route.thinking) {
    body.thinking = { type: 'enabled' };
    if (route.reasoningEffort !== 'off') {
      body.reasoning_effort = route.reasoningEffort;
    }
  }
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs || 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    if (fetchErr?.name === 'AbortError') {
      throw new DeepSeekError(`DeepSeek request timed out after ${timeoutMs}ms`, 408, { isRetryable: true });
    }
    throw new DeepSeekError(`Network error reaching DeepSeek: ${fetchErr?.message || 'Unknown'}`, 0, { isRetryable: true });
  }
  clearTimeout(timeoutId);
  let data: any;
  try { data = await response.json(); } catch { throw new DeepSeekError('DeepSeek returned invalid JSON.', response.status, { isRetryable: true }); }
  if (!response.ok) throw classifyApiError(response.status, data);
  const choice = data?.choices?.[0];
  return {
    text: choice?.message?.content || '',
    reasoningContent: choice?.message?.reasoning_content,
    modelUsed: route.model,
    tokensUsed: data?.usage?.total_tokens || 0,
    finishReason: choice?.finish_reason || 'unknown',
  };
}

export interface CallOptions {
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
}

export async function generateWithRetry(
  route: EngineRoute,
  messages: DeepSeekMessage[],
  opts?: CallOptions
): Promise<DeepSeekResult> {
  const maxRetries = opts?.maxRetries ?? 3;
  const baseDelay = opts?.baseDelayMs ?? 1000;
  let lastErr: DeepSeekError | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callDeepSeek(route, messages, opts);
    } catch (err) {
      lastErr = err instanceof DeepSeekError ? err : new DeepSeekError(String(err), 0);
      if (!lastErr.isRetryable || lastErr.status === 401 || lastErr.status === 400) throw lastErr;
      if (attempt >= maxRetries) break;
      const delay = lastErr.isRateLimit
        ? baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        : baseDelay * Math.pow(1.5, attempt);
      console.warn(`[DeepSeek] Attempt ${attempt + 1} failed (${lastErr.message}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr || new DeepSeekError('DeepSeek request failed after retries.', 0);
}

export async function askDeepSeek(
  uiEngineId: string,
  messages: DeepSeekMessage[],
  opts?: CallOptions
): Promise<DeepSeekResult> {
  const route = resolveEngineRoute(uiEngineId);
  return generateWithRetry(route, messages, opts);
}

export async function checkDeepSeekHealth(): Promise<{ ok: boolean; model: DeepSeekModelId; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const result = await callDeepSeek(ENGINE_ROUTES.NORMAL_CHAT, [{ role: 'user', content: 'ping' }], { maxTokens: 5, timeoutMs: 10000 });
    return { ok: true, model: result.modelUsed, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, model: 'deepseek-v4-flash', latencyMs: Date.now() - start, error: err?.message };
  }
}

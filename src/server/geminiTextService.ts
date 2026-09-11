/**
 * Velcora Gemini Text Service
 * Handles text generation using Google Gemini as the backup provider.
 * Separate from the GoogleGenAI SDK used for image/video generation.
 */
import { GoogleGenAI } from '@google/genai';

export type GeminiModelId = 'gemini-flash-lite-latest' | 'gemini-3.5-flash';

export interface GeminiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeminiResult {
  text: string;
  modelUsed: GeminiModelId;
  tokensUsed: number;
  finishReason: string;
}

export class GeminiError extends Error {
  status: number;
  isRetryable: boolean;
  isRateLimit: boolean;
  constructor(message: string, status: number, opts?: { isRetryable?: boolean; isRateLimit?: boolean }) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
    this.isRetryable = opts?.isRetryable ?? false;
    this.isRateLimit = opts?.isRateLimit ?? false;
  }
}

// ─── API Key ─────────────────────────────────────────────────────────────────

let cachedKey: string | null | undefined = undefined;

export function getGeminiTextApiKey(): string | null {
  if (cachedKey !== undefined) return cachedKey;
  const key = process.env.GEMINI_API_KEY || '';
  if (!key || typeof key !== 'string' || key.trim() === '' || key.startsWith('ENTER_') || key.length < 10) {
    cachedKey = null;
    return null;
  }
  cachedKey = key.trim();
  return cachedKey;
}

export function isGeminiTextConfigured(): boolean {
  return getGeminiTextApiKey() !== null;
}

// ─── Model Config ────────────────────────────────────────────────────────────

const GEMINI_TEXT_MODELS: Record<GeminiModelId, { label: string; supportsThinking: boolean }> = {
  'gemini-flash-lite-latest': { label: 'Gemini Flash-Lite (latest)', supportsThinking: false },
  'gemini-3.5-flash': { label: 'Gemini 3.5 Flash', supportsThinking: true },
};

// ─── Client ──────────────────────────────────────────────────────────────────

let geminiTextClient: GoogleGenAI | null = null;

function getGeminiTextClient(): GoogleGenAI | null {
  if (geminiTextClient) return geminiTextClient;
  const key = getGeminiTextApiKey();
  if (!key) return null;
  geminiTextClient = new GoogleGenAI({ apiKey: key });
  return geminiTextClient;
}

// ─── API Call ────────────────────────────────────────────────────────────────

async function callGeminiText(
  modelId: GeminiModelId,
  messages: GeminiMessage[],
  opts?: { systemInstruction?: string; temperature?: number; maxTokens?: number; thinking?: boolean; timeoutMs?: number }
): Promise<GeminiResult> {
  const client = getGeminiTextClient();
  if (!client) throw new GeminiError('GEMINI_API_KEY is not configured.', 401, { isRetryable: false });

  // Convert messages to Gemini contents format
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs || 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.models.generateContent({
      model: modelId,
      contents,
      systemInstruction: opts?.systemInstruction,
      signal: controller.signal,
    } as any);
    clearTimeout(timeoutId);

    const text = (response as any)?.text || (response as any)?.[0]?.text || '';
    return {
      text: typeof text === 'string' ? text : '',
      modelUsed: modelId,
      tokensUsed: 0,
      finishReason: 'stop',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new GeminiError(`Gemini request timed out after ${timeoutMs}ms`, 408, { isRetryable: true });
    }
    const status = err?.status || 500;
    const isRateLimit = status === 429;
    const isRetryable = isRateLimit || status >= 500 || status === 408;
    throw new GeminiError(err?.message || 'Gemini request failed', status, { isRetryable, isRateLimit });
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateGeminiText(
  modelId: GeminiModelId,
  messages: GeminiMessage[],
  opts?: { systemInstruction?: string; temperature?: number; maxTokens?: number; thinking?: boolean; timeoutMs?: number; maxRetries?: number }
): Promise<GeminiResult> {
  const maxRetries = opts?.maxRetries ?? 2;
  let lastErr: GeminiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callGeminiText(modelId, messages, opts);
    } catch (err) {
      lastErr = err instanceof GeminiError ? err : new GeminiError(String(err), 500);
      if (!lastErr.isRetryable || lastErr.status === 401) throw lastErr;
      if (attempt >= maxRetries) break;
      const delay = lastErr.isRateLimit ? 2000 * (attempt + 1) : 500 * (attempt + 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr || new GeminiError('Gemini request failed after retries.', 500);
}

export async function checkGeminiTextHealth(): Promise<{ ok: boolean; model: GeminiModelId; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await callGeminiText('gemini-flash-lite-latest', [{ role: 'user', content: 'ping' }], { maxTokens: 16, timeoutMs: 15000 });
    return { ok: true, model: 'gemini-flash-lite-latest', latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, model: 'gemini-flash-lite-latest', latencyMs: Date.now() - start, error: err?.message };
  }
}
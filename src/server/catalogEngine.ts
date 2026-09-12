/**
 * Velcora Universal Business Catalog Engine
 * ---------------------------------------------------------------------------
 * Replaces the hardcoded per-industry product schema with an AI-adaptive,
 * business-specific catalog definition.
 *
 * This module does NOT introduce a new AI engine. It reuses the single
 * unified router (`routeAIRequest` -> DeepSeek V4 Pro primary, Gemini
 * automatic fallback) that the whole platform already uses.
 *
 * Flow:
 *   Customer business requirements (source of truth)
 *     -> DeepSeek V4 Pro  (primary)
 *     -> Gemini           (automatic fallback, same single credit charge)
 *     -> validated CatalogSchema (dynamic fields + conditional capabilities)
 *
 * Safety: the model is explicitly forbidden from fabricating facts. Anything
 * medical / legal / financial / otherwise specialised is flagged
 * `safetyCritical` and never asserted as fact.
 */
import { routeAIRequest, NormalizedRequest } from './aiRouter';

export type CatalogFieldType =
  | 'text' | 'textarea' | 'number' | 'currency' | 'weight'
  | 'date' | 'boolean' | 'select' | 'multiselect';

export type CatalogFieldScope = 'item' | 'variant' | 'order' | 'customer';

/** Core POS fields a generated field can bind to (so existing screens keep working). */
export type CatalogCoreBinding =
  | 'name' | 'sku' | 'barcode' | 'category' | 'brand' | 'costPrice' | 'sellingPrice'
  | 'stock' | 'minStock' | 'unit' | 'description' | 'duration' | 'assignedStaff'
  | 'appointmentRequired' | 'commissionRate' | 'requirements' | 'taxRate';

export interface CatalogField {
  key: string;
  label: string;
  type: CatalogFieldType;
  scope: CatalogFieldScope;
  required: boolean;
  options?: string[];
  unit?: string;
  help?: string;
  examples?: string[];
  /** When set, this field maps onto an existing core POS column. */
  core?: CatalogCoreBinding;
  /** Medical / legal / financial / high-stakes info — never invented. */
  safetyCritical?: boolean;
}

/** Feature toggles. `false` hides the feature; the code is never removed. */
export interface CatalogCapabilities {
  barcodes: boolean;
  sku: boolean;
  stock: boolean;
  variants: boolean;
  batchTracking: boolean;
  serialTracking: boolean;
  expiry: boolean;
  weightBased: boolean;
  appointments: boolean;
  suppliers: boolean;
  loyalty: boolean;
  onlineStore: boolean;
}

export interface CatalogSchema {
  version: 1;
  businessType: string;
  summary: string;
  itemLabelSingular: string;
  itemLabelPlural: string;
  sellingModel: 'unit' | 'weight' | 'service' | 'duration' | 'measure' | 'mixed' | 'custom';
  units: string[];
  categories: string[];
  fields: CatalogField[];
  capabilities: CatalogCapabilities;
  workflows: string[];
  researchNotes?: string;
  safetyNotes?: string;
  confidence: number;
  source: 'ai' | 'fallback';
  provider?: string;
  model?: string;
  generatedAt?: string;
}

export interface CatalogRequest {
  businessRequirements: string;
  businessName?: string;
  industry?: string;
  businessModel?: string;
  currency?: string;
  country?: string;
  existingNotes?: string;
}

const ALL_TYPES: CatalogFieldType[] = ['text', 'textarea', 'number', 'currency', 'weight', 'date', 'boolean', 'select', 'multiselect'];
const ALL_SCOPES: CatalogFieldScope[] = ['item', 'variant', 'order', 'customer'];
const ALL_CORES: CatalogCoreBinding[] = [
  'name', 'sku', 'barcode', 'category', 'brand', 'costPrice', 'sellingPrice', 'stock',
  'minStock', 'unit', 'description', 'duration', 'assignedStaff', 'appointmentRequired',
  'commissionRate', 'requirements', 'taxRate',
];

export const NEUTRAL_CAPABILITIES: CatalogCapabilities = {
  barcodes: false, sku: false, stock: false, variants: false, batchTracking: false,
  serialTracking: false, expiry: false, weightBased: false, appointments: false,
  suppliers: false, loyalty: false, onlineStore: false,
};

// ─── Prompt ──────────────────────────────────────────────────────────────────

export const CATALOG_ARCHITECT_SYSTEM_PROMPT = `You are the VELCORA UNIVERSAL BUSINESS CATALOG ARCHITECT.

Your job: given ONE business's real requirements, design the EXACT catalog/schema that business needs — nothing more, nothing less.

ABSOLUTE RULES
1. The customer's stated requirements are the SOURCE OF TRUTH. Never overrule them.
2. NEVER assume retail. Do NOT add barcode, SKU, stock, variants, expiry, or batch fields unless that business genuinely needs them.
3. Nothing is globally required. Only require a field when it is truly essential for that business to operate.
4. Do NOT hardcode or reuse a fixed industry template. Derive the schema from the business itself. An unusual business must get a genuinely custom schema.
5. Do NOT fabricate facts. If you are unsure how an industry works, use a neutral, general, clearly-optional field instead of inventing a standard.
6. Medical, legal, financial, pharmaceutical and other high-stakes information must NEVER be invented as fact. Mark such fields with "safetyCritical": true and keep them optional unless the customer explicitly required them.
7. Prefer FEWER, higher-quality fields (6-16). Always include a name field and a selling price field.
8. Units must match the business (Pcs, Pair, g, tola, Kg, Hour, Session, Consultation, Portion, Litre...).

OUTPUT: Return ONLY strict JSON (no markdown fences, no commentary) with this exact shape:

{
  "businessType": string,
  "summary": string,                       // 1-2 sentences describing the catalog you designed
  "itemLabelSingular": string,             // e.g. "Ornament", "Service", "Cut", "Dish", "Item"
  "itemLabelPlural": string,
  "sellingModel": "unit" | "weight" | "service" | "duration" | "measure" | "mixed" | "custom",
  "units": string[],
  "categories": string[],
  "fields": [
    {
      "key": string,                       // snake_case
      "label": string,
      "type": "text"|"textarea"|"number"|"currency"|"weight"|"date"|"boolean"|"select"|"multiselect",
      "scope": "item"|"variant"|"order"|"customer",
      "required": boolean,
      "options": string[],                 // only for select/multiselect
      "unit": string,                      // optional
      "help": string,                      // optional short hint
      "examples": string[],                // optional
      "core": "name"|"sku"|"barcode"|"category"|"brand"|"costPrice"|"sellingPrice"|"stock"|"minStock"|"unit"|"description"|"duration"|"assignedStaff"|"appointmentRequired"|"commissionRate"|"requirements"|"taxRate",  // only when the field maps to an existing core POS column
      "safetyCritical": boolean            // optional
    }
  ],
  "capabilities": {
    "barcodes": boolean, "sku": boolean, "stock": boolean, "variants": boolean,
    "batchTracking": boolean, "serialTracking": boolean, "expiry": boolean,
    "weightBased": boolean, "appointments": boolean, "suppliers": boolean,
    "loyalty": boolean, "onlineStore": boolean
  },
  "workflows": string[],                   // e.g. ["pos","appointments","batches"]
  "researchNotes": string,                 // how you reasoned; say plainly if you used general knowledge
  "safetyNotes": string,                   // any caution for medical/legal/financial catalogs, else ""
  "confidence": number                     // 0..1
}

Always bind "name" and "sellingPrice" fields to their core counterparts when included.`;

export function buildCatalogUserPrompt(req: CatalogRequest): string {
  const lines = [
    'BUSINESS REQUIREMENTS (source of truth):',
    req.businessRequirements || '(none provided)',
  ];
  if (req.businessName) lines.push(`\nBusiness name: ${req.businessName}`);
  if (req.industry) lines.push(`Stated industry: ${req.industry}`);
  if (req.businessModel) lines.push(`Business model: ${req.businessModel}`);
  if (req.currency) lines.push(`Currency: ${req.currency}`);
  if (req.country) lines.push(`Country/region: ${req.country}`);
  if (req.existingNotes) lines.push(`Additional notes: ${req.existingNotes}`);
  lines.push(
    '\nDesign the exact catalog this business needs. Remember: irrelevant fields must be OMITTED and their capability flags set to false.'
  );
  return lines.join('\n');
}

// ─── Sanitisation (never trust raw model output) ─────────────────────────────

function safeStr(v: any, max = 200): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  return s ? s.slice(0, max) : undefined;
}

function safeStrArr(v: any, maxItems = 24, itemMax = 60): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const it of v) {
    const s = safeStr(it, itemMax);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out.length ? out : undefined;
}

function toField(raw: any): CatalogField | null {
  if (!raw || typeof raw !== 'object') return null;
  const key = String(raw.key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const label = safeStr(raw.label, 60);
  if (!key || !label) return null;

  const type: CatalogFieldType = ALL_TYPES.includes(raw.type) ? raw.type : 'text';
  const scope: CatalogFieldScope = ALL_SCOPES.includes(raw.scope) ? raw.scope : 'item';
  const field: CatalogField = { key, label, type, scope, required: raw.required === true };

  const options = safeStrArr(raw.options, 40, 40);
  if (options) field.options = options;
  if (type === 'select' || type === 'multiselect') {
    if (!field.options || field.options.length === 0) field.options = ['Other'];
  }
  const unit = safeStr(raw.unit, 20); if (unit) field.unit = unit;
  const help = safeStr(raw.help, 160); if (help) field.help = help;
  const examples = safeStrArr(raw.examples, 6, 60); if (examples) field.examples = examples;
  if (ALL_CORES.includes(raw.core)) field.core = raw.core;
  if (raw.safetyCritical === true) field.safetyCritical = true;
  return field;
}

function hasWeightField(fields: CatalogField[]): boolean {
  return fields.some(f => f.type === 'weight' || /weight|gram|kg|karat|tola|carat|purity/i.test(f.key));
}

function toCapabilities(raw: any, fields: CatalogField[]): CatalogCapabilities {
  const caps: any = { ...NEUTRAL_CAPABILITIES };
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(NEUTRAL_CAPABILITIES)) {
      if (typeof raw[k] === 'boolean') caps[k] = raw[k];
    }
  }
  const has = (pred: (f: CatalogField) => boolean) => fields.some(pred);
  const scopes = (s: CatalogFieldScope) => fields.filter(f => f.scope === s);
  if (has(f => f.key === 'barcode' || f.core === 'barcode')) caps.barcodes = true;
  if (has(f => f.key === 'sku' || f.core === 'sku')) caps.sku = true;
  if (has(f => f.core === 'stock' || f.key === 'stock')) caps.stock = true;
  if (scopes('variant').length > 0) caps.variants = true;
  if (has(f => f.key.includes('batch'))) caps.batchTracking = true;
  if (has(f => f.key.includes('serial') || f.key.includes('imei'))) caps.serialTracking = true;
  if (has(f => f.key.includes('expiry') || f.key.includes('expiration'))) caps.expiry = true;
  if (hasWeightField(fields)) caps.weightBased = true;
  if (scopes('order').some(f => f.key.includes('appointment') || f.key.includes('slot') || f.key.includes('booking'))) caps.appointments = true;
  return caps;
}

/** Guarantee the two universally-necessary catalog anchors exist. */
function ensureAnchors(fields: CatalogField[]): CatalogField[] {
  const out = [...fields];
  if (!out.some(f => f.core === 'name' || f.key === 'name')) {
    out.unshift({ key: 'name', label: 'Name', type: 'text', scope: 'item', required: true, core: 'name' });
  }
  if (!out.some(f => f.core === 'sellingPrice' || f.key === 'selling_price' || f.key === 'price')) {
    out.push({ key: 'selling_price', label: 'Selling Price', type: 'currency', scope: 'item', required: true, core: 'sellingPrice' });
  }
  return out;
}

export function sanitizeCatalogSchema(raw: any, req: CatalogRequest): CatalogSchema {
  const rawFields = Array.isArray(raw?.fields) ? raw.fields : [];
  const seen = new Set<string>();
  const fields: CatalogField[] = [];
  for (const rf of rawFields) {
    const f = toField(rf);
    if (!f || seen.has(f.key)) continue;
    seen.add(f.key);
    fields.push(f);
    if (fields.length >= 40) break;
  }
  const anchored = ensureAnchors(fields);

  const sellingModel = ['unit', 'weight', 'service', 'duration', 'measure', 'mixed', 'custom']
    .includes(raw?.sellingModel) ? raw.sellingModel : 'unit';

  return {
    version: 1,
    businessType: safeStr(raw?.businessType, 80) || req.industry || 'General Business',
    summary: safeStr(raw?.summary, 400) || 'A catalog tailored to this business.',
    itemLabelSingular: safeStr(raw?.itemLabelSingular, 40) || 'Item',
    itemLabelPlural: safeStr(raw?.itemLabelPlural, 40) || 'Items',
    sellingModel,
    units: safeStrArr(raw?.units, 16, 20) || ['Pcs'],
    categories: safeStrArr(raw?.categories, 24, 60) || ['General'],
    fields: anchored,
    capabilities: toCapabilities(raw?.capabilities, anchored),
    workflows: safeStrArr(raw?.workflows, 16, 40) || ['pos'],
    researchNotes: safeStr(raw?.researchNotes, 600),
    safetyNotes: safeStr(raw?.safetyNotes, 600),
    confidence: typeof raw?.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.6,
    source: 'ai',
  };
}

/**
 * Minimal, assumption-free catalog used only when the AI is unavailable.
 * It deliberately enables NO retail-specific capability.
 */
export function neutralFallbackSchema(req: CatalogRequest): CatalogSchema {
  return {
    version: 1,
    businessType: req.industry || 'General Business',
    summary: 'A minimal, industry-neutral catalog. Customise fields to match your business.',
    itemLabelSingular: 'Item',
    itemLabelPlural: 'Items',
    sellingModel: 'custom',
    units: ['Unit'],
    categories: ['General'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', scope: 'item', required: true, core: 'name' },
      { key: 'category', label: 'Category / Group', type: 'text', scope: 'item', required: false, core: 'category' },
      { key: 'selling_price', label: 'Selling Price', type: 'currency', scope: 'item', required: true, core: 'sellingPrice' },
      { key: 'description', label: 'Description', type: 'textarea', scope: 'item', required: false, core: 'description' },
    ],
    capabilities: { ...NEUTRAL_CAPABILITIES },
    workflows: ['pos'],
    researchNotes: 'AI catalog generation was unavailable; a neutral schema was used instead of assuming a retail template.',
    confidence: 0.3,
    source: 'fallback',
  };
}

/** Extract the first JSON object from a model reply (tolerates fences/prose). */
export function extractCatalogJson(text: string): any | null {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Generate a business-specific catalog using the platform's SINGLE unified AI
 * engine (DeepSeek V4 Pro primary -> Gemini automatic fallback).
 * Credit reservation/settlement is owned by the caller (server.ts), exactly
 * like /api/ai/ask, so a failover still charges exactly once.
 */
export async function generateCatalogSchema(
  req: CatalogRequest,
  ctx?: { userId?: string; requestId?: string; businessId?: string }
): Promise<CatalogSchema> {
  const baseMessages = [
    { role: 'system' as const, content: CATALOG_ARCHITECT_SYSTEM_PROMPT },
    { role: 'user' as const, content: buildCatalogUserPrompt(req) },
  ];

  const REPAIR_INSTRUCTION =
    'Your previous reply was not usable. Reply with ONLY one minified JSON object that matches the required schema exactly. No markdown fences, no prose, no comments, no trailing text.';

  let lastErr: Error | null = null;

  // Single attempt: two provider tries (16s + 16s = 32s) must fit inside the
  // endpoint deadline, so the repair pass is disabled here.
  for (let attempt = 0; attempt < 1; attempt++) {
    const messages = attempt === 0
      ? baseMessages
      : [...baseMessages, { role: 'user' as const, content: REPAIR_INSTRUCTION }];

    const normalized: NormalizedRequest & { userId?: string; requestId?: string; businessId?: string } = {
      // NORMAL_CHAT -> deepseek-v4-flash (primary) with gemini-flash-lite-latest
      // (fallback). Both are fast enough for a structured JSON task inside the
      // 60s serverless budget. The heavier "thinking" tier (v4-pro) is used
      // elsewhere; here reliability of the catalog build matters most.
      engineId: 'velcora-chat',
      messages,
      maxTokens: 4000,
      temperature: 0.2,
      // Budget: 20s primary + 20s fallback = 40s, inside the 52s endpoint
      // deadline and the 60s serverless limit (no 504).
      timeoutMs: 20000,
      maxRetries: 0,
      userId: ctx?.userId,
      requestId: ctx?.requestId,
      businessId: ctx?.businessId,
    };

    let res;
    try {
      res = await routeAIRequest(normalized);
    } catch (err: any) {
      // Provider-level failure: return fast (the endpoint supplies a neutral schema).
      throw new Error(err?.message || 'AI engine unavailable');
    }

    if (!res.success || !res.content) {
      throw new Error(res.error || 'AI catalog generation failed.');
    }

    const parsed = extractCatalogJson(res.content);
    if (!parsed || !Array.isArray((parsed as any)?.fields)) {
      // Model replied but not with usable JSON -> one strict repair pass.
      lastErr = new Error('AI returned an unusable catalog payload.');
      continue;
    }

    const schema = sanitizeCatalogSchema(parsed, req);
    schema.provider = res.provider;
    schema.model = res.model;
    schema.generatedAt = new Date().toISOString();
    return schema;
  }

  throw lastErr || new Error('AI catalog generation failed.');
}




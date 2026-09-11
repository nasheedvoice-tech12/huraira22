/**
 * Velcora Centralized Model & Engine Registry
 *
 * Defines the unified, user-facing Velcora AI Engine identities,
 * their capabilities, and their mappings to backend neural models/providers.
 *
 * Directives:
 * - User-facing names represent Velcora's proprietary engine identity.
 * - Provider names and raw model strings are abstracted from normal user conversations.
 * - Every engine defines fallback candidates, input/output capabilities, and resilience rules.
 */

export type VelcoraEngineId =
  | 'chat'
  | 'omni'
  | 'flash'
  | 'axiom'
  | 'flash-omni-1'
  | 'financial-axiom'
  | 'velcora-chat'
  | 'velcora-neural-flash'
  | 'velcora-axiom'
  | 'velcora-omni'
  | 'velcora-financial'
  | 'velcora-prism-lite'
  | 'velcora-prism'
  | 'velcora-prism-pro'
  | 'velcora-veyra-lite'
  | 'velcora-veyra'
  | 'velcora-veyra-pro';

export type EngineCapability =
  | 'fast_text'
  | 'deep_reasoning'
  | 'multimodal'
  | 'creative_studio'
  | 'financial'
  | 'image_generation'
  | 'video_generation';

export type InputModality = 'text' | 'image' | 'document' | 'audio' | 'video';
export type OutputModality = 'text' | 'json' | 'image' | 'video' | 'financial_report';

export interface VelcoraEngineDefinition {
  id: VelcoraEngineId | string;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  provider: 'Velcora AI';
  capability: EngineCapability;
  category: 'Fast & Direct' | 'Reasoning' | 'Multimodal Vision' | 'Creative Writing' | 'Code & Math';
  latencyMs: number;
  costPer1kTokens: number;
  contextWindow: string;
  status: 'active' | 'standby' | 'fallback';
  badge: string;
  backendModelCandidates: string[];
  supportedInputs: InputModality[];
  supportedOutputs: OutputModality[];
  isDeterministicFirst?: boolean;
  isCreativeSubEngine?: boolean;
}

export const VELCORA_ENGINES: VelcoraEngineDefinition[] = [
  {
    id: 'chat',
    name: 'Normal Chat',
    shortName: 'Chat',
    subtitle: 'DeepSeek V4 Flash • Fast & Direct',
    description: 'Everyday conversational AI for general questions, quick assistance, and basic business inquiries. Optimized for speed and low cost.',
    provider: 'Velcora AI',
    capability: 'fast_text',
    category: 'Fast & Direct',
    latencyMs: 90,
    costPer1kTokens: 0,
    contextWindow: '128,000',
    status: 'active',
    badge: '💬 DeepSeek V4 Flash',
    backendModelCandidates: ['deepseek-v4-flash'],
    supportedInputs: ['text', 'image', 'document'],
    supportedOutputs: ['text', 'json'],
  },
  {
    id: 'flash',
    name: 'Flash',
    shortName: 'Flash',
    subtitle: 'DeepSeek V4 Flash • Fast Reasoning',
    description: 'Fast reasoning AI for business analysis, data analysis, and more complex questions. Balances speed with reasoning capability.',
    provider: 'Velcora AI',
    capability: 'deep_reasoning',
    category: 'Fast & Direct',
    latencyMs: 70,
    costPer1kTokens: 0.00015,
    contextWindow: '128,000',
    status: 'active',
    badge: '⚡ DeepSeek V4 Flash + Thinking',
    backendModelCandidates: ['deepseek-v4-flash'],
    supportedInputs: ['text', 'image', 'document'],
    supportedOutputs: ['text', 'json'],
  },
  {
    id: 'omni',
    name: 'Omni',
    shortName: 'Omni',
    subtitle: 'DeepSeek V4 Pro • Deep Reasoning',
    description: 'Advanced reasoning engine for complex questions, multi-step analysis, sales/inventory/historical analysis, and recommendations.',
    provider: 'Velcora AI',
    capability: 'deep_reasoning',
    category: 'Reasoning',
    latencyMs: 190,
    costPer1kTokens: 0.0008,
    contextWindow: '128,000',
    status: 'active',
    badge: '🧠 DeepSeek V4 Pro + Thinking',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'image', 'document'],
    supportedOutputs: ['text', 'json'],
  },
  {
    id: 'axiom',
    name: 'Financial Agent',
    shortName: 'Financial',
    subtitle: 'DeepSeek V4 Pro • Financial Analysis',
    description: 'Specialized financial analysis for revenue, profit/loss, expenses, cash flow, margins, and budget analysis. NEVER invents numbers — retrieves real data only.',
    provider: 'Velcora AI',
    capability: 'financial',
    category: 'Reasoning',
    latencyMs: 220,
    costPer1kTokens: 0.001,
    contextWindow: '128,000',
    status: 'active',
    badge: '📊 DeepSeek V4 Pro Financial',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'image', 'document'],
    supportedOutputs: ['text', 'json', 'financial_report'],
    isDeterministicFirst: true,
  },
  {
    id: 'axiom',
    name: 'Axiom',
    shortName: 'Axiom Financial',
    subtitle: 'Claude Opus 5 Engine • Financial BI',
    description: 'Specialized business and financial intelligence engine powered by Claude Opus 5 backend engine calculating real-time margin math, profit audits, cash flow telemetry, and POS analytics.',
    provider: 'Velcora AI',
    capability: 'financial',
    category: 'Code & Math',
    latencyMs: 120,
    costPer1kTokens: 0.0005,
    contextWindow: '512,000',
    status: 'active',
    badge: '📊 Claude Opus 5 Backend',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'document'],
    supportedOutputs: ['text', 'json', 'financial_report'],
    isDeterministicFirst: true,
  },
  {
    id: 'flash-omni-1',
    name: 'Flash Omni.1',
    shortName: 'Flash Omni.1',
    subtitle: 'Fast & General Purpose',
    description: 'High-speed intelligence for POS operations, quick customer lookups, instant answers, inventory inquiries, and day-to-day store management.',
    provider: 'Velcora AI',
    capability: 'fast_text',
    category: 'Fast & Direct',
    latencyMs: 140,
    costPer1kTokens: 0.00015,
    contextWindow: '1,000,000',
    status: 'active',
    badge: '⚡ Fast & Direct',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'image', 'document'],
    supportedOutputs: ['text', 'json'],
  },
  {
    id: 'financial-axiom',
    name: 'Financial Axiom',
    shortName: 'Financial Axiom',
    subtitle: 'Financial Analysis Expert',
    description: 'Specialized ledger computation and financial analysis engine executing margin math, profit audits, cash flow projections, and fiscal reporting.',
    provider: 'Velcora AI',
    capability: 'financial',
    category: 'Code & Math',
    latencyMs: 180,
    costPer1kTokens: 0.0005,
    contextWindow: '128,000',
    status: 'active',
    badge: '📊 Financial Expert',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'document'],
    supportedOutputs: ['text', 'json', 'financial_report'],
    isDeterministicFirst: true,
  },
  {
    id: 'velcora-brain',
    name: 'Velcora Business Brain',
    shortName: 'Business Brain',
    subtitle: 'Central Strategic Business & Ledger Brain',
    description: 'Central executive intelligence engine deeply integrated with live store telemetry, inventory velocity, Second Brain durable memory, and universal business problem solving.',
    provider: 'Velcora AI',
    capability: 'deep_reasoning',
    category: 'Reasoning',
    latencyMs: 200,
    costPer1kTokens: 0.0005,
    contextWindow: '2,000,000',
    status: 'active',
    badge: '🧠 Business Brain',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'image', 'document'],
    supportedOutputs: ['text', 'json'],
  },
  {
    id: 'velcora-fashion-dealer',
    name: 'Velcora FashionDealer',
    shortName: 'FashionDealer',
    subtitle: 'Specialized Fashion Market Intelligence',
    description: 'Specialized high-fidelity neural engine for fashion forecasting, apparel design ideation, and lifestyle merchandising strategies.',
    provider: 'Velcora AI',
    capability: 'creative_studio',
    category: 'Creative Writing',
    latencyMs: 220,
    costPer1kTokens: 0.0006,
    contextWindow: '512,000',
    status: 'active',
    badge: '👗 Fashion-Only',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'image'],
    supportedOutputs: ['text', 'json'],
  },
  {
    id: 'velcora-chat',
    name: 'Velcora Chat',
    shortName: 'Velcora Chat',
    subtitle: 'Claude Haiku 4.5 Executive Chat',
    description: 'Fast, general-purpose operational assistant utilizing Anthropic\'s Claude Haiku 4.5 model for superior customer responses.',
    provider: 'Velcora AI',
    capability: 'fast_text',
    category: 'Fast & Direct',
    latencyMs: 150,
    costPer1kTokens: 0,
    contextWindow: '1,000,000',
    status: 'active',
    badge: '💬 Claude Haiku 4.5',
    backendModelCandidates: ['deepseek-v4-flash'],
    supportedInputs: ['text', 'image', 'document'],
    supportedOutputs: ['text', 'json'],
  },
  {
    id: 'velcora-neural-flash',
    name: 'Velcora Neural Flash',
    shortName: 'Neural Flash',
    subtitle: 'Ultra-fast sub-second operational assistant',
    description: 'Frontier lightweight neural pipeline powered by Claude Sonnet 5 optimized for POS workflows, instant customer lookups, and receipt analysis.',
    provider: 'Velcora AI',
    capability: 'fast_text',
    category: 'Fast & Direct',
    latencyMs: 180,
    costPer1kTokens: 0.00015,
    contextWindow: '1,000,000',
    status: 'active',
    badge: '⚡ Claude Sonnet 5',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'image', 'document'],
    supportedOutputs: ['text', 'json'],
  },
  {
    id: 'velcora-axiom',
    name: 'Velcora Axiom',
    shortName: 'Axiom',
    subtitle: 'Fast Business Intelligence & POS Operations',
    description: 'Ultra-fast neural BI engine connected to Claude Opus 5. Sub-second responses for POS stock, product counts, daily revenue, and operational queries.',
    provider: 'Velcora AI',
    capability: 'fast_text',
    category: 'Fast & Direct',
    latencyMs: 140,
    costPer1kTokens: 0.00015,
    contextWindow: '1,000,000',
    status: 'active',
    badge: '⚡ Claude Opus 5',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'image', 'document'],
    supportedOutputs: ['text', 'json'],
  },
  {
    id: 'velcora-omni',
    name: 'Velcora Omni',
    shortName: 'Omni',
    subtitle: 'Universal AI Router & Deep Reasoning Engine',
    description: 'High-capacity frontier reasoning engine powered by Claude Sonnet 5. Optimized for multi-step strategic planning, large code/script analysis, Second Brain knowledge, and complex workflows.',
    provider: 'Velcora AI',
    capability: 'deep_reasoning',
    category: 'Reasoning',
    latencyMs: 380,
    costPer1kTokens: 0.0015,
    contextWindow: '2,000,000',
    status: 'active',
    badge: '🧠 Claude Sonnet 5',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'image', 'document', 'audio', 'video'],
    supportedOutputs: ['text', 'json'],
  },
  {
    id: 'velcora-financial',
    name: 'Velcora Financial',
    shortName: 'Financial Engine',
    subtitle: 'Deterministic ledger mathematics + natural language explanation',
    description: 'Audited financial computation engine powered by Claude Opus 5 executing exact ledger math (revenue, margins, COGS, tax ledgers, break-even, budgets) grounded by AI explanations.',
    provider: 'Velcora AI',
    capability: 'financial',
    category: 'Code & Math',
    latencyMs: 190,
    costPer1kTokens: 0.0005,
    contextWindow: '128,000',
    status: 'active',
    badge: '📊 Claude Opus 5',
    backendModelCandidates: ['deepseek-v4-pro'],
    supportedInputs: ['text', 'document'],
    supportedOutputs: ['text', 'json', 'financial_report'],
    isDeterministicFirst: true,
  },

  // Studio Sub-Engines: Image (Velcora Prism Suite)
  {
    id: 'velcora-prism-lite',
    name: 'Velcora Prism Lite',
    shortName: 'Prism Lite',
    subtitle: 'Fast commercial image & product isolation',
    description: 'High-speed image generation tuned for e-commerce catalog isolation and clean single-subject product photography.',
    provider: 'Velcora AI',
    capability: 'image_generation',
    category: 'Multimodal Vision',
    latencyMs: 1400,
    costPer1kTokens: 0.004,
    contextWindow: '32,000',
    status: 'active',
    badge: '🎨 Prism Lite',
    backendModelCandidates: ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'],
    supportedInputs: ['text', 'image'],
    supportedOutputs: ['image'],
    isCreativeSubEngine: true,
  },
  {
    id: 'velcora-prism',
    name: 'Velcora Prism',
    shortName: 'Prism',
    subtitle: 'High-fidelity commercial studio photography',
    description: 'Primary creative image synthesis engine rendering editorial compositions, realistic fabrics, lighting reflections, and human models.',
    provider: 'Velcora AI',
    capability: 'image_generation',
    category: 'Multimodal Vision',
    latencyMs: 2200,
    costPer1kTokens: 0.008,
    contextWindow: '64,000',
    status: 'standby',
    badge: '🌟 Prism HQ',
    backendModelCandidates: ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'],
    supportedInputs: ['text', 'image'],
    supportedOutputs: ['image'],
    isCreativeSubEngine: true,
  },
  {
    id: 'velcora-prism-pro',
    name: 'Velcora Prism Pro',
    shortName: 'Prism Pro',
    subtitle: 'Ultra-resolution luxury editorial synthesis',
    description: 'Professional visual studio engine for billboard-grade advertisements, intricate multi-entity staging, and custom luxury styling.',
    provider: 'Velcora AI',
    capability: 'image_generation',
    category: 'Multimodal Vision',
    latencyMs: 3800,
    costPer1kTokens: 0.015,
    contextWindow: '128,000',
    status: 'standby',
    badge: '💎 Prism Pro',
    backendModelCandidates: ['gemini-3.1-flash-image'],
    supportedInputs: ['text', 'image'],
    supportedOutputs: ['image'],
    isCreativeSubEngine: true,
  },

  // Studio Sub-Engines: Video (Velcora Veyra Suite)
  {
    id: 'velcora-veyra-lite',
    name: 'Velcora Veyra Lite',
    shortName: 'Veyra Lite',
    subtitle: 'Fast 720p social motion & promotional reels',
    description: 'Rapid video generation pipeline for dynamic social ads, product rotations, and animated storefront announcements.',
    provider: 'Velcora AI',
    capability: 'video_generation',
    category: 'Multimodal Vision',
    latencyMs: 8000,
    costPer1kTokens: 0.02,
    contextWindow: '64,000',
    status: 'standby',
    badge: '🎬 Veyra Lite',
    backendModelCandidates: ['veo-3.1-lite-generate-preview'],
    supportedInputs: ['text', 'image'],
    supportedOutputs: ['video'],
    isCreativeSubEngine: true,
  },
  {
    id: 'velcora-veyra',
    name: 'Velcora Veyra',
    shortName: 'Veyra',
    subtitle: '1080p cinematic commercial video pipeline',
    description: 'Full neural video synthesis engine producing continuous camera movements, temporal physics consistency, and lighting transitions.',
    provider: 'Velcora AI',
    capability: 'video_generation',
    category: 'Multimodal Vision',
    latencyMs: 14000,
    costPer1kTokens: 0.04,
    contextWindow: '128,000',
    status: 'standby',
    badge: '🎥 Veyra 1080p',
    backendModelCandidates: ['veo-3.1-lite-generate-preview'],
    supportedInputs: ['text', 'image'],
    supportedOutputs: ['video'],
    isCreativeSubEngine: true,
  },
  {
    id: 'velcora-veyra-pro',
    name: 'Velcora Veyra Pro',
    shortName: 'Veyra Pro',
    subtitle: 'High-framerate multi-shot video orchestration',
    description: 'Flagship video creation engine orchestrating multi-cut editorial sequences, smooth dolly shots, and audio-reactive pacing.',
    provider: 'Velcora AI',
    capability: 'video_generation',
    category: 'Multimodal Vision',
    latencyMs: 22000,
    costPer1kTokens: 0.08,
    contextWindow: '256,000',
    status: 'standby',
    badge: '👑 Veyra Pro',
    backendModelCandidates: ['veo-3.1-lite-generate-preview'],
    supportedInputs: ['text', 'image'],
    supportedOutputs: ['video'],
    isCreativeSubEngine: true,
  },
];

/**
 * Maps any legacy or user-entered engine ID to the canonical Velcora Engine definition.
 */
export function resolveVelcoraEngine(engineIdOrModel?: string): VelcoraEngineDefinition {
  if (!engineIdOrModel) {
    return VELCORA_ENGINES[0]; // Velcora Neural Flash
  }

  const normalized = engineIdOrModel.trim().toLowerCase();

  // 1. Direct ID match
  const directMatch = VELCORA_ENGINES.find(e => e.id.toLowerCase() === normalized);
  if (directMatch) return directMatch;

  // 2. Name or alias match
  if (normalized === 'chat' || normalized === 'velcora-chat' || normalized.includes('chat')) {
    return VELCORA_ENGINES.find(e => e.id === 'chat' || e.id === 'velcora-chat') || VELCORA_ENGINES[0];
  }
  if (normalized === 'omni' || normalized.includes('omni') && !normalized.includes('flash-omni')) {
    return VELCORA_ENGINES.find(e => e.id === 'omni') || VELCORA_ENGINES[1];
  }
  if (normalized === 'flash' || normalized.includes('neural-flash')) {
    return VELCORA_ENGINES.find(e => e.id === 'flash') || VELCORA_ENGINES[2];
  }
  if (normalized === 'axiom' || normalized.includes('axiom') && !normalized.includes('financial-axiom')) {
    return VELCORA_ENGINES.find(e => e.id === 'axiom') || VELCORA_ENGINES[3];
  }
  if (normalized.includes('flash-omni') || normalized.includes('flash omni') || normalized.includes('omni.1')) {
    return VELCORA_ENGINES.find(e => e.id === 'flash') || VELCORA_ENGINES[2];
  }
  if (normalized.includes('financial-axiom') || normalized.includes('financial axiom')) {
    return VELCORA_ENGINES.find(e => e.id === 'axiom') || VELCORA_ENGINES[3];
  }
  if (normalized.includes('brain') || normalized.includes('business-brain')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-brain') || VELCORA_ENGINES[0];
  }
  if (normalized.includes('fashion-dealer') || normalized.includes('fashiondealer')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-fashion-dealer')!;
  }
  if (normalized.includes('axiom') || normalized.includes('axoum') || normalized.includes('deep-thinking') || normalized.includes('deep reasoning')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-axiom')!;
  }
  if (normalized.includes('omni')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-omni')!;
  }
  if (normalized.includes('studio') || normalized.includes('creative')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-omni')!;
  }
  if (normalized.includes('financial') || normalized.includes('finance') || normalized.includes('quant')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-financial')!;
  }
  if (normalized.includes('prism-pro')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-prism-pro')!;
  }
  if (normalized.includes('prism-lite')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-prism-lite')!;
  }
  if (normalized.includes('prism')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-prism')!;
  }
  if (normalized.includes('veyra-pro')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-veyra-pro')!;
  }
  if (normalized.includes('veyra-lite')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-veyra-lite')!;
  }
  if (normalized.includes('veyra') || normalized.includes('veo')) {
    return VELCORA_ENGINES.find(e => e.id === 'velcora-veyra')!;
  }

  // Default fallback to Chat
  return VELCORA_ENGINES[0];
}

/**
 * Returns user-facing primary engines for AI Router interface (Chat, Omni, Flash, Axiom)
 */
export function getPrimaryVelcoraEngines(): VelcoraEngineDefinition[] {
  return VELCORA_ENGINES.filter(e => e.id === 'chat' || e.id === 'omni' || e.id === 'flash' || e.id === 'axiom');
}

/**
 * Returns all image sub-engines (Prism Suite)
 */
export function getPrismImageEngines(): VelcoraEngineDefinition[] {
  return VELCORA_ENGINES.filter(e => e.capability === 'image_generation');
}

/**
 * Returns all video sub-engines (Veyra Suite)
 */
export function getVeyraVideoEngines(): VelcoraEngineDefinition[] {
  return VELCORA_ENGINES.filter(e => e.capability === 'video_generation');
}

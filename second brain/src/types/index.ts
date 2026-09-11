export type UUID = string;
export type ISODateString = string;

export type MemoryTier = 'permanent' | 'contextual' | 'temporary' | 'user';

export type MemoryClassification =
  | 'temporary'
  | 'context'
  | 'memory'
  | 'knowledge'
  | 'decision'
  | 'insight';

export type KnowledgeAuthority =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'USER_PROVIDED'
  | 'SYSTEM_GENERATED'
  | 'INFERRED';

export type WikiCategory =
  | 'entities'
  | 'concepts'
  | 'topics'
  | 'decisions'
  | 'insights'
  | 'sources'
  | 'syntheses'
  | 'conversations';

export interface MemoryItem {
  id: UUID;
  tenantId: string;
  userId?: string | null;
  tier: MemoryTier;
  classification: MemoryClassification;
  content: string;
  summary?: string;
  tags: string[];
  entities: string[];
  concepts: string[];
  authority: KnowledgeAuthority;
  confidence: number; // 0.0 to 1.0
  status: 'active' | 'archived' | 'stale' | 'deprecated';
  source?: string;
  provenance?: string;
  expiresAt?: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  metadata?: Record<string, any>;
}

export interface WikiFrontmatter {
  id: string;
  title: string;
  category: WikiCategory;
  tenantId: string;
  userId?: string | null;
  tags?: string[];
  aliases?: string[];
  authority?: KnowledgeAuthority;
  confidence?: number;
  status?: 'draft' | 'active' | 'archived' | 'deprecated';
  source?: string;
  provenance?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  relatedWikilinks?: string[];
  [key: string]: any;
}

export interface WikiDocument {
  id: string;
  title: string;
  slug: string;
  category: WikiCategory;
  filePath: string;
  frontmatter: WikiFrontmatter;
  content: string; // Markdown body without frontmatter
  rawContent: string; // Raw markdown including YAML frontmatter
  wikilinks: string[]; // Parsed targets e.g. ["Apex Boutique", "Leather Boots"]
  backlinks: string[]; // List of doc IDs or titles that point here
}

export type RelationshipType =
  | 'mentions'
  | 'relates_to'
  | 'contradicts'
  | 'derived_from'
  | 'supports'
  | 'part_of'
  | 'owned_by'
  | 'depends_on';

export interface RelationshipNode {
  id: UUID;
  tenantId: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relationshipType: RelationshipType;
  strength: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  createdAt: ISODateString;
  metadata?: Record<string, any>;
}

export type ContradictionStatus = 'unresolved' | 'resolved' | 'dismissed';

export interface ContradictionItem {
  id: UUID;
  tenantId: string;
  topic: string;
  oldClaim: string;
  newClaim: string;
  oldTimestamp: ISODateString;
  newTimestamp: ISODateString;
  oldSource?: string;
  newSource?: string;
  oldAuthority: KnowledgeAuthority;
  newAuthority: KnowledgeAuthority;
  oldConfidence: number;
  newConfidence: number;
  status: ContradictionStatus;
  resolutionExplanation?: string;
  detectedAt: ISODateString;
  resolvedAt?: ISODateString;
}

export interface RawSourceItem {
  id: UUID;
  tenantId: string;
  userId?: string | null;
  title: string;
  sourceType: 'document' | 'conversation' | 'business_ledger' | 'studio_asset' | 'user_input' | 'system_event';
  immutable: boolean;
  rawContent: string;
  filePath: string;
  mimeType?: string;
  hash: string;
  createdAt: ISODateString;
  metadata?: Record<string, any>;
}

export interface ReasoningContext {
  answerContext: string;
  relevantMemories: MemoryItem[];
  relevantEntities: WikiDocument[];
  relevantConcepts: WikiDocument[];
  sources: string[];
  contradictions: ContradictionItem[];
  confidence: number;
  suggestedActions?: string[];
  graphExpansion?: {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ from: string; to: string; label: string }>;
  };
}

export interface QueryOptions {
  query: string;
  tenantId: string;
  userId?: string | null;
  conversationHistory?: any[];
  tier?: MemoryTier;
  classification?: MemoryClassification;
  categories?: WikiCategory[];
  tags?: string[];
  entities?: string[];
  limit?: number;
  minConfidence?: number;
  includeStale?: boolean;
}

export interface IngestPayload {
  tenantId: string;
  userId?: string | null;
  sourceType: RawSourceItem['sourceType'];
  title: string;
  content: string;
  classification?: MemoryClassification;
  tier?: MemoryTier;
  authority?: KnowledgeAuthority;
  tags?: string[];
  entities?: string[];
  concepts?: string[];
  metadata?: Record<string, any>;
}

export interface StoreMemoryPayload {
  tenantId: string;
  userId?: string | null;
  tier?: MemoryTier;
  classification: MemoryClassification;
  content: string;
  summary?: string;
  tags?: string[];
  entities?: string[];
  concepts?: string[];
  authority?: KnowledgeAuthority;
  confidence?: number;
  source?: string;
  provenance?: string;
  ttlSeconds?: number;
  metadata?: Record<string, any>;
}

export interface UpdateMemoryPayload {
  id: UUID;
  tenantId: string;
  userId?: string | null;
  content?: string;
  summary?: string;
  tier?: MemoryTier;
  classification?: MemoryClassification;
  tags?: string[];
  entities?: string[];
  concepts?: string[];
  authority?: KnowledgeAuthority;
  confidence?: number;
  status?: MemoryItem['status'];
  metadata?: Record<string, any>;
}

export interface LintError {
  type: 'broken_wikilink' | 'malformed_frontmatter' | 'schema_violation' | 'invalid_classification';
  message: string;
  filePath?: string;
  docId?: string;
  details?: any;
}

export interface LintWarning {
  type: 'orphan_page' | 'unindexed_page' | 'stale_memory' | 'unresolved_contradiction' | 'low_confidence';
  message: string;
  filePath?: string;
  docId?: string;
  details?: any;
}

export interface LintReport {
  valid: boolean;
  errors: LintError[];
  warnings: LintWarning[];
  stats: {
    totalMemories: number;
    totalWikiPages: number;
    totalRelationships: number;
    brokenWikilinks: number;
    orphanPages: number;
    unindexedPages: number;
    contradictionsCount: number;
    staleMemoriesCount: number;
    malformedFrontmatterCount: number;
  };
  generatedAt: ISODateString;
}

export interface LearningCandidate {
  tenantId: string;
  userId?: string | null;
  text: string;
  speakerRole: 'user' | 'assistant' | 'business_system';
  topicOrModule?: string;
  businessContext?: Record<string, any>;
}

export interface LearningResult {
  learned: boolean;
  reason: string;
  extractedClassification?: MemoryClassification;
  createdMemoryId?: string;
  createdWikiSlug?: string;
}

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  MemoryItem,
  MemoryTier,
  MemoryClassification,
  StoreMemoryPayload,
  UpdateMemoryPayload,
  QueryOptions,
  UUID,
} from '../../types';
import { logger } from '../logging/logger';

export class MemoryService {
  private baseDir: string;
  private tierDirs: Record<MemoryTier, string>;
  private cache: Map<UUID, MemoryItem> = new Map();
  private initialized = false;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'second brain/memory');
    this.tierDirs = {
      permanent: path.join(this.baseDir, 'permanent'),
      contextual: path.join(this.baseDir, 'contextual'),
      temporary: path.join(this.baseDir, 'temporary'),
      user: path.join(this.baseDir, 'user'),
    };
    this.ensureDirs();
    this.loadAllFromDisk();
  }

  private ensureDirs() {
    try {
      Object.values(this.tierDirs).forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
    } catch (e) {
      // safe fallback
    }
  }

  public loadAllFromDisk() {
    this.cache.clear();
    try {
      this.ensureDirs();
      (Object.keys(this.tierDirs) as MemoryTier[]).forEach(tier => {
        const dir = this.tierDirs[tier];
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            if (file.endsWith('.json')) {
              try {
                const fullPath = path.join(dir, file);
                const raw = fs.readFileSync(fullPath, 'utf8');
                const item: MemoryItem = JSON.parse(raw);
                if (item && item.id) {
                  this.cache.set(item.id, item);
                }
              } catch (err) {
                console.warn(`[MemoryService] Failed to read ${file}:`, err);
              }
            }
          });
        }
      });
      this.initialized = true;
    } catch (err) {
      console.warn('[MemoryService] Initialization error:', err);
    }
  }

  private getFilePath(tier: MemoryTier, id: UUID): string {
    return path.join(this.tierDirs[tier], `${id}.json`);
  }

  private writeToDisk(item: MemoryItem) {
    try {
      this.ensureDirs();
      const filePath = this.getFilePath(item.tier, item.id);
      fs.writeFileSync(filePath, JSON.stringify(item, null, 2), 'utf8');
    } catch (err) {
      console.error(`[MemoryService] Write failure for ${item.id}:`, err);
    }
  }

  private removeFromDisk(tier: MemoryTier, id: UUID) {
    try {
      const filePath = this.getFilePath(tier, id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`[MemoryService] Remove failure for ${id}:`, err);
    }
  }

  // Common English stopwords to ignore during relevance scoring
  private static readonly STOPWORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
    'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
    'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself',
    'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
    'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off',
    'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
    'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
    'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
    'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself',
    'yourselves', 'tell', 'explain', 'describe', 'please', 'give'
  ]);

  // Duplicate prevention based on normalized text similarity
  public findDuplicate(content: string, tenantId: string): MemoryItem | null {
    const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ');
    for (const item of this.cache.values()) {
      if (item.tenantId === tenantId && item.status === 'active') {
        const itemNorm = item.content.trim().toLowerCase().replace(/\s+/g, ' ');
        if (itemNorm === normalized) {
          return item;
        }
      }
    }
    return null;
  }

  // Find existing active memory on the same topicKey for update/supersession
  public findSuperseded(topicKey: string, tenantId: string, userId?: string | null): MemoryItem | null {
    if (!topicKey) return null;
    for (const item of this.cache.values()) {
      if (item.tenantId === tenantId && item.status === 'active') {
        // Match topicKey from metadata or tags
        const itemTopic = item.metadata?.topicKey;
        if (itemTopic && itemTopic.toLowerCase() === topicKey.toLowerCase()) {
          if (item.tier === 'user' && item.userId && userId && item.userId !== userId) {
            continue;
          }
          return item;
        }
      }
    }
    return null;
  }

  // Clear all memories belonging to a specific user (Privacy & Control)
  public clearUserMemories(tenantId: string, userId?: string | null): { deletedCount: number } {
    let deletedCount = 0;
    const toDelete: MemoryItem[] = [];

    for (const item of this.cache.values()) {
      if (item.tenantId === tenantId) {
        if (userId && item.userId === userId) {
          toDelete.push(item);
        } else if (!userId && item.tier === 'user') {
          toDelete.push(item);
        }
      }
    }

    toDelete.forEach(item => {
      this.cache.delete(item.id);
      this.removeFromDisk(item.tier, item.id);
      deletedCount++;
    });

    logger.audit(tenantId, 'memory', 'CLEAR_USER_MEMORIES', { userId, deletedCount });
    return { deletedCount };
  }

  public store(payload: StoreMemoryPayload): MemoryItem {
    if (!payload.tenantId) {
      throw new Error('Tenant ID is strictly required for memory storage.');
    }
    if (!payload.content || !payload.content.trim()) {
      throw new Error('Memory content cannot be empty.');
    }

    // Check duplicate
    const existing = this.findDuplicate(payload.content, payload.tenantId);
    if (existing) {
      // Bump updated time and confidence if higher
      existing.updatedAt = new Date().toISOString();
      if (payload.confidence && payload.confidence > existing.confidence) {
        existing.confidence = payload.confidence;
      }
      this.writeToDisk(existing);
      logger.info(payload.tenantId, 'memory', 'DEDUPLICATE_UPDATE', { id: existing.id });
      return existing;
    }

    const now = new Date().toISOString();
    let expiresAt: string | null = null;
    if (payload.ttlSeconds && payload.ttlSeconds > 0) {
      expiresAt = new Date(Date.now() + payload.ttlSeconds * 1000).toISOString();
    } else if (payload.tier === 'temporary') {
      // Default 24h TTL for temporary tier if not specified
      expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    }

    const tier: MemoryTier = payload.tier || (payload.userId ? 'user' : 'contextual');
    const id = uuidv4();

    const item: MemoryItem = {
      id,
      tenantId: payload.tenantId,
      userId: payload.userId || null,
      tier,
      classification: payload.classification || 'memory',
      content: payload.content.trim(),
      summary: payload.summary || payload.content.trim().slice(0, 160),
      tags: payload.tags || [],
      entities: payload.entities || [],
      concepts: payload.concepts || [],
      authority: payload.authority || 'USER_PROVIDED',
      confidence: typeof payload.confidence === 'number' ? payload.confidence : 0.95,
      status: 'active',
      source: payload.source || 'Velcora System',
      provenance: payload.provenance || 'User interaction',
      expiresAt,
      createdAt: now,
      updatedAt: now,
      metadata: payload.metadata || {},
    };

    this.cache.set(item.id, item);
    this.writeToDisk(item);

    logger.audit(payload.tenantId, 'memory', 'STORE', {
      id: item.id,
      tier: item.tier,
      classification: item.classification,
      contentSnippet: item.content.slice(0, 80),
    });

    return item;
  }

  public getById(id: UUID, tenantId: string, userId?: string | null): MemoryItem | null {
    const item = this.cache.get(id);
    if (!item) return null;
    if (item.tenantId !== tenantId) {
      return null; // Strict tenant isolation
    }
    if (item.tier === 'user' && item.userId && userId && item.userId !== userId) {
      return null; // Strict user isolation for private tier
    }
    return item;
  }

  public update(payload: UpdateMemoryPayload): MemoryItem {
    const item = this.getById(payload.id, payload.tenantId, payload.userId);
    if (!item) {
      throw new Error(`Memory item ${payload.id} not found or access denied.`);
    }

    const oldTier = item.tier;
    const newTier = payload.tier || oldTier;

    if (payload.content !== undefined) item.content = payload.content;
    if (payload.summary !== undefined) item.summary = payload.summary;
    if (payload.classification !== undefined) item.classification = payload.classification;
    if (payload.tags !== undefined) item.tags = payload.tags;
    if (payload.entities !== undefined) item.entities = payload.entities;
    if (payload.concepts !== undefined) item.concepts = payload.concepts;
    if (payload.authority !== undefined) item.authority = payload.authority;
    if (payload.confidence !== undefined) item.confidence = payload.confidence;
    if (payload.status !== undefined) item.status = payload.status;
    if (payload.metadata !== undefined) item.metadata = { ...item.metadata, ...payload.metadata };

    item.updatedAt = new Date().toISOString();

    if (newTier !== oldTier) {
      this.removeFromDisk(oldTier, item.id);
      item.tier = newTier;
    }

    this.cache.set(item.id, item);
    this.writeToDisk(item);

    logger.audit(payload.tenantId, 'memory', 'UPDATE', { id: item.id, tier: item.tier });
    return item;
  }

  public delete(id: UUID, tenantId: string, userId?: string | null): boolean {
    const item = this.getById(id, tenantId, userId);
    if (!item) return false;

    this.cache.delete(id);
    this.removeFromDisk(item.tier, id);

    logger.audit(tenantId, 'memory', 'DELETE', { id, tier: item.tier });
    return true;
  }

  public promote(id: UUID, targetTier: MemoryTier, tenantId: string, userId?: string | null): MemoryItem {
    return this.update({ id, tenantId, userId, tier: targetTier });
  }

  public demote(id: UUID, targetTier: MemoryTier, tenantId: string, userId?: string | null): MemoryItem {
    return this.update({ id, tenantId, userId, tier: targetTier });
  }

  public cleanStale(): { cleanedCount: number; expiredIds: string[] } {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, item] of this.cache.entries()) {
      if (item.expiresAt) {
        const expTime = new Date(item.expiresAt).getTime();
        if (expTime < now) {
          item.status = 'stale';
          this.writeToDisk(item);
          expiredIds.push(id);
        }
      }
    }

    if (expiredIds.length > 0) {
      logger.info('system', 'memory', 'CLEAN_STALE', { expiredCount: expiredIds.length });
    }

    return { cleanedCount: expiredIds.length, expiredIds };
  }

  public query(options: QueryOptions): MemoryItem[] {
    const {
      query,
      tenantId,
      userId,
      tier,
      classification,
      tags,
      entities,
      limit = 20,
      minConfidence = 0.0,
      includeStale = false,
    } = options;

    if (!tenantId) return [];

    // Extract meaningful search terms (excluding stopwords and short tokens)
    const rawTokens = (query || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);

    const significantTerms = rawTokens.filter(t => !MemoryService.STOPWORDS.has(t));

    const results: Array<{ item: MemoryItem; score: number }> = [];

    for (const item of this.cache.values()) {
      // 1. Tenant Isolation
      if (item.tenantId !== tenantId) continue;

      // 2. User Isolation
      if (item.tier === 'user' && item.userId && userId && item.userId !== userId) continue;

      // 3. Stale check
      if (!includeStale && (item.status === 'stale' || item.status === 'archived')) continue;

      // 4. Expiration check
      if (!includeStale && item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) continue;

      // 5. Tier / Classification filter
      if (tier && item.tier !== tier) continue;
      if (classification && item.classification !== classification) continue;

      // 6. Confidence filter
      if (item.confidence < minConfidence) continue;

      // 7. Tags / Entities filter
      if (tags && tags.length > 0) {
        const hasTag = tags.some(t => item.tags.map(x => x.toLowerCase()).includes(t.toLowerCase()));
        if (!hasTag) continue;
      }
      if (entities && entities.length > 0) {
        const hasEntity = entities.some(e => item.entities.map(x => x.toLowerCase()).includes(e.toLowerCase()));
        if (!hasEntity) continue;
      }

      // 8. Relevance Scoring
      let score = 0;
      const contentLower = item.content.toLowerCase();
      const summaryLower = (item.summary || '').toLowerCase();
      const tagsLower = item.tags.map(t => t.toLowerCase());
      const entitiesLower = item.entities.map(e => e.toLowerCase());

      if (!query || query.trim().length === 0) {
        score = 1.0;
      } else if (significantTerms.length === 0) {
        // Query only had stopwords (e.g. "What should I do about it?") -> Check exact query match only
        if (contentLower.includes(query.toLowerCase().trim())) {
          score += 3.0;
        } else {
          score = 0; // Don't match random memories
        }
      } else {
        let matchedTerms = 0;
        significantTerms.forEach(term => {
          let termMatched = false;
          if (contentLower.includes(term)) { score += 3.5; termMatched = true; }
          if (summaryLower.includes(term)) { score += 2.5; termMatched = true; }
          if (tagsLower.some(t => t.includes(term))) { score += 3.0; termMatched = true; }
          if (entitiesLower.some(e => e.includes(term))) { score += 4.0; termMatched = true; }
          if (termMatched) matchedTerms++;
        });

        // Exact query phrase boost
        if (query && contentLower.includes(query.toLowerCase().trim())) {
          score += 6.0;
        }

        // If not a single significant term matched, zero out score
        if (matchedTerms === 0 && !contentLower.includes(query.toLowerCase().trim())) {
          score = 0;
        }
      }

      if (score > 0) {
        // Boost permanent and user-provided authority
        if (item.tier === 'permanent') score *= 1.3;
        if (item.tier === 'user') score *= 1.25;
        if (item.authority === 'PRIMARY') score *= 1.4;
        if (item.authority === 'USER_PROVIDED') score *= 1.2;
        score *= item.confidence;

        results.push({ item, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map(r => r.item);
  }

  public getAllForTenant(tenantId: string): MemoryItem[] {
    return Array.from(this.cache.values()).filter(item => item.tenantId === tenantId);
  }

  public count(tenantId?: string): number {
    if (!tenantId) return this.cache.size;
    return this.getAllForTenant(tenantId).length;
  }
}

export const memoryService = new MemoryService();

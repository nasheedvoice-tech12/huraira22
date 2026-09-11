import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  IngestPayload,
  RawSourceItem,
  MemoryItem,
  WikiDocument,
  KnowledgeAuthority,
} from '../../types';
import { memoryService } from '../memory/memoryService';
import { wikiService } from '../indexing/wikiService';
import { relationshipGraphService } from '../relationships/relationshipGraph';
import { logger } from '../logging/logger';

export class IngestionService {
  private rawDir: string;

  constructor(baseDir?: string) {
    this.rawDir = baseDir || path.resolve(process.cwd(), 'second brain/raw');
    this.ensureDirs();
  }

  private ensureDirs() {
    try {
      ['documents', 'conversations', 'business', 'studio', 'images', 'assets'].forEach(sub => {
        const dir = path.join(this.rawDir, sub);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      });
    } catch (e) {
      // safe fallback
    }
  }

  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  // Store raw source immutably
  public storeRawSource(
    tenantId: string,
    sourceType: RawSourceItem['sourceType'],
    title: string,
    content: string,
    userId?: string | null,
    metadata?: Record<string, any>
  ): RawSourceItem {
    this.ensureDirs();
    const id = uuidv4();
    const hash = this.computeHash(content);
    const dateStr = new Date().toISOString().slice(0, 10);
    const safeTitle = wikiService.slugify(title);
    const subFolder =
      sourceType === 'conversation'
        ? 'conversations'
        : sourceType === 'business_ledger'
        ? 'business'
        : sourceType === 'studio_asset'
        ? 'studio'
        : 'documents';

    const filename = `${dateStr}-${safeTitle}-${id.slice(0, 8)}.txt`;
    const filePath = path.join(this.rawDir, subFolder, filename);

    // Save immutable raw content
    fs.writeFileSync(filePath, content, 'utf8');

    const item: RawSourceItem = {
      id,
      tenantId,
      userId: userId || null,
      title,
      sourceType,
      immutable: true,
      rawContent: content,
      filePath,
      hash,
      createdAt: new Date().toISOString(),
      metadata: metadata || {},
    };

    logger.info(tenantId, 'ingestion', 'STORE_RAW_SOURCE', {
      id,
      sourceType,
      filePath: filename,
    });

    return item;
  }

  // Complete ingestion flow: Raw -> Extract -> Connect -> Store in Memory & Wiki
  public async ingest(payload: IngestPayload): Promise<{
    rawSource: RawSourceItem;
    memoryItem?: MemoryItem;
    wikiDoc?: WikiDocument;
    extractedEntities: string[];
    extractedWikilinks: string[];
  }> {
    if (!payload.tenantId) {
      throw new Error('Tenant ID is required for ingestion.');
    }

    // 1. Immutable Raw Ingestion
    const rawSource = this.storeRawSource(
      payload.tenantId,
      payload.sourceType,
      payload.title,
      payload.content,
      payload.userId,
      payload.metadata
    );

    // 2. Entity & Wikilink Extraction
    const extractedWikilinks = wikiService.extractWikilinks(payload.content);
    const extractedEntities = Array.from(
      new Set([
        ...(payload.entities || []),
        ...extractedWikilinks,
      ])
    );

    // 3. Store Memory Record
    const memoryItem = memoryService.store({
      tenantId: payload.tenantId,
      userId: payload.userId,
      tier: payload.tier || 'contextual',
      classification: payload.classification || 'knowledge',
      content: payload.content,
      summary: payload.title,
      tags: payload.tags || [],
      entities: extractedEntities,
      concepts: payload.concepts || [],
      authority: payload.authority || 'PRIMARY',
      confidence: 0.95,
      source: rawSource.filePath,
      provenance: `Ingested from ${payload.sourceType} [${payload.title}]`,
      metadata: {
        rawSourceId: rawSource.id,
        rawHash: rawSource.hash,
        ...payload.metadata,
      },
    });

    // 4. Create or Update Wiki Document if it qualifies as structured Knowledge / Decision / Insight
    let wikiDoc: WikiDocument | undefined;
    if (
      payload.classification === 'knowledge' ||
      payload.classification === 'decision' ||
      payload.classification === 'insight' ||
      extractedWikilinks.length > 0
    ) {
      const category =
        payload.classification === 'decision'
          ? 'decisions'
          : payload.classification === 'insight'
          ? 'insights'
          : payload.sourceType === 'conversation'
          ? 'conversations'
          : 'topics';

      wikiDoc = wikiService.saveDocument(
        category,
        payload.title,
        payload.content,
        {
          tenantId: payload.tenantId,
          userId: payload.userId,
          tags: payload.tags || [],
          authority: payload.authority || 'PRIMARY',
          confidence: 0.95,
          source: rawSource.filePath,
          provenance: `Raw ID: ${rawSource.id}`,
        }
      );

      // Connect Relationships to Extracted Entities in Graph
      extractedEntities.forEach(entityName => {
        const targetSlug = wikiService.slugify(entityName);
        relationshipGraphService.addRelationship(
          payload.tenantId,
          wikiDoc!.id,
          'wiki_page',
          targetSlug,
          'entity',
          'mentions',
          0.85,
          0.95
        );
      });
    }

    logger.learn(payload.tenantId, 'ingestion', 'INGEST_COMPLETE', {
      rawId: rawSource.id,
      memoryId: memoryItem.id,
      wikiSlug: wikiDoc?.slug,
      entitiesCount: extractedEntities.length,
    });

    return {
      rawSource,
      memoryItem,
      wikiDoc,
      extractedEntities,
      extractedWikilinks,
    };
  }
}

export const ingestionService = new IngestionService();

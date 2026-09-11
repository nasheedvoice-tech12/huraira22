import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ContradictionItem, KnowledgeAuthority, UUID } from '../../types';
import { logger } from '../logging/logger';

export class ContradictionService {
  private contradictions: Map<UUID, ContradictionItem> = new Map();
  private storeFile: string;

  constructor(baseDir?: string) {
    const root = baseDir || path.resolve(process.cwd(), 'second brain/memory');
    this.storeFile = path.join(root, 'contradictions.json');
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storeFile)) {
        const raw = fs.readFileSync(this.storeFile, 'utf8');
        const items: ContradictionItem[] = JSON.parse(raw);
        items.forEach(item => this.contradictions.set(item.id, item));
      }
    } catch (err) {
      console.warn('[ContradictionService] Error loading contradictions:', err);
    }
  }

  private writeToDisk() {
    try {
      const dir = path.dirname(this.storeFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.storeFile,
        JSON.stringify(Array.from(this.contradictions.values()), null, 2),
        'utf8'
      );
    } catch (err) {
      console.warn('[ContradictionService] Error saving contradictions:', err);
    }
  }

  // Detect and record a contradiction without silently overwriting the old claim
  public detectOrRecord(
    tenantId: string,
    topic: string,
    oldClaim: string,
    newClaim: string,
    oldTimestamp: string,
    newTimestamp: string,
    oldAuthority: KnowledgeAuthority,
    newAuthority: KnowledgeAuthority,
    oldConfidence: number = 0.8,
    newConfidence: number = 0.8,
    oldSource?: string,
    newSource?: string
  ): ContradictionItem {
    // Check if identical contradiction already recorded
    for (const c of this.contradictions.values()) {
      if (
        c.tenantId === tenantId &&
        c.topic.toLowerCase() === topic.toLowerCase() &&
        c.oldClaim === oldClaim &&
        c.newClaim === newClaim
      ) {
        return c;
      }
    }

    const id = uuidv4();
    const item: ContradictionItem = {
      id,
      tenantId,
      topic,
      oldClaim,
      newClaim,
      oldTimestamp,
      newTimestamp,
      oldAuthority,
      newAuthority,
      oldConfidence,
      newConfidence,
      oldSource,
      newSource,
      status: 'unresolved',
      detectedAt: new Date().toISOString(),
    };

    this.contradictions.set(id, item);
    this.writeToDisk();

    logger.warn(tenantId, 'contradiction', 'DETECT_CONTRADICTION', {
      topic,
      oldClaimSnippet: oldClaim.slice(0, 50),
      newClaimSnippet: newClaim.slice(0, 50),
    });

    return item;
  }

  public resolve(
    id: UUID,
    tenantId: string,
    explanation: string,
    resolutionStatus: 'resolved' | 'dismissed' = 'resolved'
  ): ContradictionItem {
    const item = this.contradictions.get(id);
    if (!item || item.tenantId !== tenantId) {
      throw new Error(`Contradiction ${id} not found or tenant access denied.`);
    }

    item.status = resolutionStatus;
    item.resolutionExplanation = explanation;
    item.resolvedAt = new Date().toISOString();

    this.writeToDisk();
    logger.audit(tenantId, 'contradiction', 'RESOLVE_CONTRADICTION', {
      id,
      resolutionStatus,
      explanation,
    });

    return item;
  }

  public getForTopic(topic: string, tenantId: string): ContradictionItem[] {
    const list: ContradictionItem[] = [];
    const tLower = topic.toLowerCase();
    for (const c of this.contradictions.values()) {
      if (c.tenantId === tenantId && (c.topic.toLowerCase().includes(tLower) || tLower.includes(c.topic.toLowerCase()))) {
        list.push(c);
      }
    }
    return list;
  }

  public getAll(tenantId: string, unresolvedOnly: boolean = false): ContradictionItem[] {
    return Array.from(this.contradictions.values()).filter(c => {
      if (c.tenantId !== tenantId) return false;
      if (unresolvedOnly && c.status !== 'unresolved') return false;
      return true;
    });
  }

  public count(tenantId?: string): number {
    if (!tenantId) return this.contradictions.size;
    return this.getAll(tenantId, false).length;
  }
}

export const contradictionService = new ContradictionService();

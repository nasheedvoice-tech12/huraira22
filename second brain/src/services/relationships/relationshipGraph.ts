import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RelationshipNode, RelationshipType, UUID } from '../../types';
import { logger } from '../logging/logger';

export class RelationshipGraphService {
  private relationships: Map<UUID, RelationshipNode> = new Map();
  private storeFile: string;

  constructor(baseDir?: string) {
    const root = baseDir || path.resolve(process.cwd(), 'second brain/memory');
    this.storeFile = path.join(root, 'relationships.json');
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storeFile)) {
        const raw = fs.readFileSync(this.storeFile, 'utf8');
        const items: RelationshipNode[] = JSON.parse(raw);
        items.forEach(item => this.relationships.set(item.id, item));
      }
    } catch (err) {
      console.warn('[RelationshipGraphService] Error loading relationships:', err);
    }
  }

  private writeToDisk() {
    try {
      const dir = path.dirname(this.storeFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.storeFile,
        JSON.stringify(Array.from(this.relationships.values()), null, 2),
        'utf8'
      );
    } catch (err) {
      console.warn('[RelationshipGraphService] Error saving relationships:', err);
    }
  }

  public addRelationship(
    tenantId: string,
    sourceId: string,
    sourceType: string,
    targetId: string,
    targetType: string,
    relationshipType: RelationshipType,
    strength: number = 0.8,
    confidence: number = 0.9,
    metadata?: Record<string, any>
  ): RelationshipNode {
    // Check if duplicate already exists
    for (const rel of this.relationships.values()) {
      if (
        rel.tenantId === tenantId &&
        rel.sourceId === sourceId &&
        rel.targetId === targetId &&
        rel.relationshipType === relationshipType
      ) {
        rel.strength = Math.max(rel.strength, strength);
        rel.confidence = Math.max(rel.confidence, confidence);
        this.writeToDisk();
        return rel;
      }
    }

    const id = uuidv4();
    const node: RelationshipNode = {
      id,
      tenantId,
      sourceId,
      sourceType,
      targetId,
      targetType,
      relationshipType,
      strength,
      confidence,
      createdAt: new Date().toISOString(),
      metadata: metadata || {},
    };

    this.relationships.set(id, node);
    this.writeToDisk();

    logger.info(tenantId, 'graph', 'ADD_RELATIONSHIP', {
      sourceId,
      targetId,
      relationshipType,
    });

    return node;
  }

  public getForNode(nodeId: string, tenantId: string): RelationshipNode[] {
    const list: RelationshipNode[] = [];
    for (const rel of this.relationships.values()) {
      if (rel.tenantId === tenantId && (rel.sourceId === nodeId || rel.targetId === nodeId)) {
        list.push(rel);
      }
    }
    return list;
  }

  // Multi-hop Graph Expansion
  public expandGraph(
    seedIds: string[],
    tenantId: string,
    maxHops: number = 2,
    maxNodes: number = 25
  ): {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ from: string; to: string; label: string; strength: number }>;
  } {
    const visitedNodes = new Set<string>(seedIds);
    const edges: Array<{ from: string; to: string; label: string; strength: number }> = [];
    let currentFrontier = [...seedIds];

    for (let hop = 0; hop < maxHops; hop++) {
      const nextFrontier: string[] = [];

      for (const id of currentFrontier) {
        const related = this.getForNode(id, tenantId);
        for (const rel of related) {
          const neighborId = rel.sourceId === id ? rel.targetId : rel.sourceId;
          edges.push({
            from: rel.sourceId,
            to: rel.targetId,
            label: rel.relationshipType,
            strength: rel.strength,
          });

          if (!visitedNodes.has(neighborId)) {
            visitedNodes.add(neighborId);
            nextFrontier.push(neighborId);
            if (visitedNodes.size >= maxNodes) break;
          }
        }
        if (visitedNodes.size >= maxNodes) break;
      }

      currentFrontier = nextFrontier;
      if (currentFrontier.length === 0 || visitedNodes.size >= maxNodes) break;
    }

    const nodes = Array.from(visitedNodes).map(id => ({
      id,
      label: id.replace(/-/g, ' '),
      type: 'entity',
    }));

    return { nodes, edges };
  }

  public count(tenantId?: string): number {
    if (!tenantId) return this.relationships.size;
    return Array.from(this.relationships.values()).filter(r => r.tenantId === tenantId).length;
  }
}

export const relationshipGraphService = new RelationshipGraphService();

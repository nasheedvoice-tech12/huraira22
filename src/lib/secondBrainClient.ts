/**
 * Velcora Second Brain Client & Adapter
 *
 * Provides typed, non-blocking, fail-soft communication between
 * the real Velcora application (Chatbot, Business Brain, Studio)
 * and the standalone Velcora Second Brain service.
 */

import { getApiUrl } from './apiConfig';

export interface BrainReasoningContext {
  answerContext: string;
  relevantMemories: Array<{
    id: string;
    content: string;
    classification: string;
    tier: string;
    authority?: string;
    confidence: number;
    tags?: string[];
  }>;
  relevantEntities: Array<{
    id: string;
    title: string;
    category: string;
    content: string;
    slug: string;
  }>;
  relevantConcepts: Array<{
    id: string;
    title: string;
    category: string;
    content: string;
  }>;
  sources: string[];
  contradictions: Array<{
    id: string;
    topic: string;
    oldClaim: string;
    newClaim: string;
    status: string;
  }>;
  confidence: number;
}

export interface BrainHealthReport {
  status: string;
  service: string;
  version: string;
  stats: {
    memoriesCount: number;
    wikiDocsCount: number;
    relationshipsCount: number;
    contradictionsCount: number;
  };
  healthReport: {
    valid: boolean;
    errors: any[];
    warnings: any[];
    stats: Record<string, number>;
  };
}

class SecondBrainClient {
  private baseUrl: string = '/api/second-brain';

  private async fetchSafe<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    try {
      const url = getApiUrl(`${this.baseUrl}${endpoint}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s fail-soft timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[SecondBrainClient] Request to ${endpoint} returned HTTP ${response.status}`);
        return null;
      }

      return (await response.json()) as T;
    } catch (err) {
      console.warn(`[SecondBrainClient] Offline or unreachable (${endpoint}):`, err);
      return null;
    }
  }

  /**
   * Health & Diagnostic check
   */
  public async getHealth(tenantId?: string): Promise<BrainHealthReport | null> {
    return this.fetchSafe<BrainHealthReport>('/health', {
      headers: tenantId ? { 'x-tenant-id': tenantId } : {},
    });
  }

  /**
   * Retrieve grounding reasoning context for AI Chatbot, Business Brain, or Studio
   */
  public async getContext(query: string, tenantId: string = 'velcora-default-store', userId?: string | null): Promise<BrainReasoningContext | null> {
    if (!query || !query.trim()) return null;
    const res = await this.fetchSafe<{ success: boolean; context: BrainReasoningContext }>(
      `/memory/context?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'x-tenant-id': tenantId,
          ...(userId ? { 'x-user-id': userId } : {}),
        },
      }
    );
    return res?.success ? res.context : null;
  }

  /**
   * Store structured business memory
   */
  public async storeMemory(payload: {
    tenantId: string;
    userId?: string | null;
    content: string;
    classification: 'temporary' | 'context' | 'memory' | 'knowledge' | 'decision' | 'insight';
    tier?: 'permanent' | 'contextual' | 'temporary' | 'user';
    tags?: string[];
    entities?: string[];
    authority?: 'PRIMARY' | 'SECONDARY' | 'USER_PROVIDED' | 'SYSTEM_GENERATED' | 'INFERRED';
  }) {
    return this.fetchSafe<{ success: boolean; memory: any }>('/memory/store', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'x-tenant-id': payload.tenantId,
        ...(payload.userId ? { 'x-user-id': payload.userId } : {}),
      },
    });
  }

  /**
   * Send interaction to Second Brain continuous learning engine
   */
  public async learn(payload: {
    tenantId: string;
    userId?: string | null;
    text: string;
    speakerRole?: 'user' | 'assistant' | 'business_system';
    topicOrModule?: string;
    businessContext?: Record<string, any>;
  }) {
    return this.fetchSafe<{ success: boolean; learned: boolean; reason: string }>('/memory/learn', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'x-tenant-id': payload.tenantId,
        ...(payload.userId ? { 'x-user-id': payload.userId } : {}),
      },
    });
  }

  /**
   * Search unified Brain documents and memories
   */
  public async search(query: string, tenantId: string = 'velcora-default-store') {
    return this.fetchSafe<{ success: boolean; memories: any[]; wikiDocuments: any[]; contradictions: any[] }>(
      `/memory/search?query=${encodeURIComponent(query)}`,
      {
        headers: { 'x-tenant-id': tenantId },
      }
    );
  }

  /**
   * Delete specific memory item
   */
  public async deleteMemory(id: string, tenantId: string) {
    return this.fetchSafe<{ success: boolean }>('/memory/' + id, {
      method: 'DELETE',
      headers: { 'x-tenant-id': tenantId },
    });
  }

  /**
   * Clear all memories for a user
   */
  public async clearUserMemories(tenantId: string, userId: string) {
    return this.fetchSafe<{ success: boolean }>('/memory/user/clear', {
      method: 'POST',
      body: JSON.stringify({ tenantId, userId }),
      headers: {
        'x-tenant-id': tenantId,
        'x-user-id': userId,
      },
    });
  }
}

export const secondBrainClient = new SecondBrainClient();

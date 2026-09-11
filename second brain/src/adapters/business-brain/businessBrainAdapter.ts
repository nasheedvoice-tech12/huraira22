import { ReasoningContext, MemoryItem, WikiDocument } from '../../types';
import { reasoningEngine } from '../../services/reasoning/reasoningEngine';
import { memoryService } from '../../services/memory/memoryService';
import { wikiService } from '../../services/indexing/wikiService';

export interface BusinessBrainAugmentPayload {
  tenantId: string;
  userId?: string | null;
  businessName?: string;
  revenue?: number;
  ordersCount?: number;
  lowStockItems?: Array<{ name: string; stock: number; sku?: string }>;
}

export interface BusinessBrainAugmentResult {
  reasoningContext: ReasoningContext;
  decisions: MemoryItem[];
  insights: MemoryItem[];
  entities: WikiDocument[];
  historicalNotes: string[];
}

export class BusinessBrainAdapter {
  public augmentBusinessBrain(payload: BusinessBrainAugmentPayload): BusinessBrainAugmentResult {
    const tenantId = payload.tenantId || 'velcora-default-store';

    // 1. Retrieve Historical Decisions and Insights
    const allMemories = memoryService.getAllForTenant(tenantId);
    const decisions = allMemories.filter(m => m.classification === 'decision' && m.status === 'active');
    const insights = allMemories.filter(m => m.classification === 'insight' && m.status === 'active');

    // 2. Query Reasoning context for business health & inventory
    const query = `${payload.businessName || 'Store'} revenue inventory sales growth`;
    const reasoningContext = reasoningEngine.buildContext({
      query,
      tenantId,
      userId: payload.userId,
      limit: 6,
    });

    // 3. Relevant Entities (e.g. Products, Suppliers, Competitors)
    const entities = wikiService.search(payload.businessName || 'Business', tenantId, 'entities', 6);

    const historicalNotes: string[] = [
      ...decisions.map(d => `[Decision] ${d.content}`),
      ...insights.map(i => `[Insight] ${i.content}`),
    ];

    return {
      reasoningContext,
      decisions,
      insights,
      entities,
      historicalNotes,
    };
  }
}

export const businessBrainAdapter = new BusinessBrainAdapter();

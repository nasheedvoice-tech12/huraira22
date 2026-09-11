import { ReasoningContext } from '../../types';
import { reasoningEngine } from '../../services/reasoning/reasoningEngine';
import { wikiService } from '../../services/indexing/wikiService';
import { memoryService } from '../../services/memory/memoryService';

export interface StudioContextRequest {
  tenantId: string;
  userId?: string | null;
  productOrTopic: string;
  assetType: 'image' | 'video' | 'promo_poster' | 'social_ad';
  businessName?: string;
}

export interface StudioContextResponse {
  brandVoice?: string;
  productDetails?: string;
  historicalCampaignInsights?: string[];
  suggestedVisualKeywords: string[];
  enrichedPromptContext: string;
}

export class StudioAdapter {
  public getStudioContext(request: StudioContextRequest): StudioContextResponse {
    const { tenantId, userId, productOrTopic, assetType, businessName } = request;
    const tId = tenantId || 'velcora-default-store';

    // 1. Search Wiki and Memories for this product / brand
    const searchQuery = `${productOrTopic} ${businessName || ''} brand style colors audience`;
    const reasoning = reasoningEngine.buildContext({
      query: searchQuery,
      tenantId: tId,
      userId,
      limit: 5,
    });

    const relevantEntities = wikiService.search(productOrTopic, tId, 'entities', 3);
    const brandDocs = wikiService.search('brand', tId, 'concepts', 2);
    const campaignInsights = memoryService.query({
      query: 'campaign ad photo visual conversion',
      tenantId: tId,
      classification: 'insight',
      limit: 3,
    });

    const visualKeywords: string[] = ['high-resolution', 'commercial lighting', 'clean composition'];
    if (relevantEntities.length > 0) {
      visualKeywords.push(relevantEntities[0].title);
    }

    let enrichedPromptContext = '';
    if (reasoning.answerContext) {
      enrichedPromptContext += `Brand and Knowledge Context:\n${reasoning.answerContext}\n`;
    }

    return {
      brandVoice: brandDocs.length > 0 ? brandDocs[0].content.slice(0, 150) : undefined,
      productDetails: relevantEntities.length > 0 ? relevantEntities[0].content.slice(0, 200) : undefined,
      historicalCampaignInsights: campaignInsights.map(c => c.content),
      suggestedVisualKeywords: visualKeywords,
      enrichedPromptContext,
    };
  }
}

export const studioAdapter = new StudioAdapter();

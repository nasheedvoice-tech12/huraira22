import { ReasoningContext, QueryOptions } from '../../types';
import { retrievalService } from '../retrieval/retrievalService';
import { logger } from '../logging/logger';

export class ReasoningEngine {
  // Generates structured context packages for Velcora's AI model to consume
  public buildContext(options: QueryOptions): ReasoningContext {
    const start = Date.now();
    const result = retrievalService.retrieveContext(options);
    const duration = Date.now() - start;

    logger.info(options.tenantId, 'reasoning', 'BUILD_CONTEXT', {
      query: options.query,
      memoriesFound: result.relevantMemories.length,
      entitiesFound: result.relevantEntities.length,
      conceptsFound: result.relevantConcepts.length,
      contradictionsCount: result.contradictions.length,
      confidence: result.confidence,
      durationMs: duration,
    });

    return result;
  }

  // Helper to format system prompt injection with Second Brain grounding
  public formatGroundingPrompt(context: ReasoningContext): string {
    if (!context.answerContext || context.answerContext.trim().length === 0) {
      return '';
    }

    let prompt = `\n--- [VELCORA SECOND BRAIN HISTORICAL GROUNDING] ---\n`;
    prompt += context.answerContext;
    if (context.contradictions.length > 0) {
      prompt += `\n\nNOTE: Acknowledge any active contradictions if discussing conflicting metrics or historical facts.\n`;
    }
    prompt += `\n--- [END SECOND BRAIN GROUNDING] ---\n`;
    return prompt;
  }
}

export const reasoningEngine = new ReasoningEngine();

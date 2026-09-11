import { ReasoningContext } from '../../types';
import { learningService } from '../../services/learning/learningService';
import { reasoningEngine } from '../../services/reasoning/reasoningEngine';
import { logger } from '../../services/logging/logger';

export interface ChatbotAugmentationRequest {
  userMessage: string;
  tenantId: string;
  userId?: string | null;
  businessContext?: Record<string, any>;
}

export interface ChatbotAugmentationResponse {
  shouldRetrieveBrain: boolean;
  groundingContext?: ReasoningContext;
  groundingPromptSnippet: string;
}

export class ChatbotAdapter {
  // Pre-processing step for Chatbot: Skip trivial messages, retrieve rich memory for strategic questions
  public prepareContext(request: ChatbotAugmentationRequest): ChatbotAugmentationResponse {
    const { userMessage, tenantId, userId } = request;

    if (learningService.isTrivial(userMessage)) {
      return {
        shouldRetrieveBrain: false,
        groundingPromptSnippet: '',
      };
    }

    const groundingContext = reasoningEngine.buildContext({
      query: userMessage,
      tenantId: tenantId || 'velcora-default-store',
      userId,
      limit: 6,
    });

    const groundingPromptSnippet = reasoningEngine.formatGroundingPrompt(groundingContext);

    return {
      shouldRetrieveBrain: true,
      groundingContext,
      groundingPromptSnippet,
    };
  }

  // Post-processing step for Chatbot: Learn valuable user decisions or insights
  public processInteractionOutcome(
    tenantId: string,
    userMessage: string,
    assistantReply: string,
    userId?: string | null,
    businessContext?: Record<string, any>
  ) {
    // 1. Evaluate User message for new directives or decisions
    if (!learningService.isTrivial(userMessage)) {
      learningService.evaluateAndLearn({
        tenantId: tenantId || 'velcora-default-store',
        userId,
        text: userMessage,
        speakerRole: 'user',
        topicOrModule: 'Chatbot User Directive',
        businessContext,
      });
    }

    // 2. If the assistant gave specific actionable recommendations or policy statements, evaluate as well
    if (assistantReply && assistantReply.length > 50) {
      const decisionMatch = assistantReply.match(/(?:decision|recommendation|strategy|policy):\s*([^\n\.]+)/i);
      if (decisionMatch) {
        learningService.evaluateAndLearn({
          tenantId: tenantId || 'velcora-default-store',
          userId,
          text: decisionMatch[1].trim(),
          speakerRole: 'assistant',
          topicOrModule: 'Chatbot Strategic Recommendation',
          businessContext,
        });
      }
    }
  }
}

export const chatbotAdapter = new ChatbotAdapter();

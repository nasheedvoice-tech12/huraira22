import { LearningCandidate, LearningResult, MemoryClassification, MemoryTier } from '../../types';
import { memoryService } from '../memory/memoryService';
import { wikiService } from '../indexing/wikiService';
import { contradictionService } from '../contradiction/contradictionService';
import { logger } from '../logging/logger';

const TRIVIAL_PATTERNS = [
  /^(hi|hello|hey|greetings|hola|good\s*(morning|afternoon|evening))\b/i,
  /^(thanks|thank\s*you|thx|ty|much\s*appreciated)\b/i,
  /^(ok|okay|k|cool|great|awesome|got\s*it|sure|yes|no|yep|nope|alright|fine)\b/i,
  /^(bye|goodbye|cya|see\s*you|farewell|later)\b/i,
  /^(test|testing|123|ping|pong)\b/i,
];

// General queries, science, math, or trivia questions that should NOT be saved as user memories
const GENERAL_QUERY_PATTERNS = [
  /^(what\s+is|what\s+are|what\s+was|who\s+is|who\s+was|who\s+wrote|who\s+created)\s+(?!my|our\s+goal|our\s+project|our\s+policy)/i,
  /^(why\s+is|why\s+are|why\s+do|why\s+does|how\s+does|how\s+do|how\s+to|how\s+can\s+i|how\s+should\s+i)\s+(?!we\s+set|i\s+set|my\s+goal)/i,
  /^(explain|describe|tell\s+me\s+about|define|calculate|translate|search\s+for)\s+(?!my|our)/i,
  /^(what\s+are\s+my\s+sales|how\s+is\s+my\s+business\s+performing|which\s+products\s+are\s+low|show\s+me\s+inventory)\b/i,
];

export interface ExtractedLearning {
  classification: MemoryClassification;
  tier: MemoryTier;
  topicKey?: string;
  tags: string[];
  entities: string[];
  summary: string;
  isUpdate: boolean;
  confidence: number;
}

export class LearningService {
  // Check if an interaction is trivial and should be ignored
  public isTrivial(text: string): boolean {
    if (!text || text.trim().length < 3) return true;
    const clean = text.trim();
    if (clean.length < 25) {
      for (const pattern of TRIVIAL_PATTERNS) {
        if (pattern.test(clean)) return true;
      }
    }
    return false;
  }

  // Check if an interaction is a general knowledge question or operational query
  public isGeneralInquiry(text: string): boolean {
    if (!text) return false;
    const clean = text.trim();

    // Check if it's explicitly a general knowledge / trivia question
    for (const pattern of GENERAL_QUERY_PATTERNS) {
      if (pattern.test(clean)) {
        // Exception: declarative user statements like "My goal is..." or "I'm building..." are NOT general queries
        const lower = clean.toLowerCase();
        if (
          lower.includes('my goal') ||
          lower.includes("i'm building") ||
          lower.includes('i am building') ||
          lower.includes('my project') ||
          lower.includes('i prefer') ||
          lower.includes('we decided')
        ) {
          return false;
        }
        return true;
      }
    }

    return false;
  }

  // Extract structured user context, goals, projects, preferences, or business rules
  public analyzeInteraction(text: string): ExtractedLearning | null {
    if (this.isTrivial(text) || this.isGeneralInquiry(text)) {
      return null;
    }

    const lower = text.toLowerCase();
    const clean = text.trim();

    // 1. User Projects & Ventures
    // e.g. "I'm building Velcora as my main software project", "My software project is Velcora", "Working on Project Apollo"
    const projectMatch = clean.match(/(?:i'm building|i am building|my project is|working on|developing)\s+([A-Za-z0-9_\-\s]{2,40}?)(?:\s+as\s+my|\s+for\s+my|\.|$|,)/i);
    if (
      lower.includes("i'm building") ||
      lower.includes('i am building') ||
      lower.includes('my project is') ||
      lower.includes('my software project') ||
      lower.includes('my main project') ||
      (lower.includes('project') && (lower.includes('building') || lower.includes('developing')))
    ) {
      const entity = projectMatch ? projectMatch[1].trim() : 'Software Project';
      const isUpdate = lower.includes('changed to') || lower.includes('new project') || lower.includes('switched to');
      return {
        classification: 'knowledge',
        tier: 'user',
        topicKey: 'user_project',
        tags: ['project', 'software', 'user_context', 'identity'],
        entities: entity && entity.length > 2 && entity.length < 30 ? [entity] : ['User Project'],
        summary: `User Project: ${clean.slice(0, 100)}`,
        isUpdate,
        confidence: 0.98,
      };
    }

    // 2. User Goals & Business Objectives
    // e.g. "My goal is $50,000 monthly revenue", "My goal has changed to $80,000", "Our target is to expand to 3 locations"
    if (
      lower.includes('my goal is') ||
      lower.includes('my goal has changed') ||
      lower.includes('my new goal') ||
      lower.includes('our target is') ||
      lower.includes('aiming for') ||
      lower.includes('plan to reach') ||
      lower.includes('target revenue is') ||
      lower.includes('update my goal')
    ) {
      const isUpdate = lower.includes('changed') || lower.includes('new goal') || lower.includes('update my goal') || lower.includes('revised');
      return {
        classification: 'decision',
        tier: 'user',
        topicKey: 'user_goal',
        tags: ['goal', 'target', 'business_objective', 'user_preference'],
        entities: ['Business Goal'],
        summary: `User Business Goal: ${clean.slice(0, 100)}`,
        isUpdate,
        confidence: 0.98,
      };
    }

    // 3. User Preferences & Working Style / Identity
    // e.g. "I prefer concise bullet points", "Call me Alex", "My name is...", "Never offer discounts above 10%", "My timezone is EST"
    if (
      lower.includes('i prefer') ||
      lower.includes('call me') ||
      lower.includes('my name is') ||
      lower.includes('my working style') ||
      lower.includes('always format') ||
      lower.includes('never use') ||
      lower.includes('my timezone is') ||
      lower.includes('keep your answers') ||
      lower.includes('i like concise')
    ) {
      const isUpdate = lower.includes('changed') || lower.includes('from now on') || lower.includes('instead');
      return {
        classification: 'insight',
        tier: 'user',
        topicKey: 'user_preference',
        tags: ['preference', 'style', 'working_mode', 'user_context'],
        entities: ['User Preferences'],
        summary: `User Preference: ${clean.slice(0, 100)}`,
        isUpdate,
        confidence: 0.95,
      };
    }

    // 4. Business Decisions & Operational Policies
    // e.g. "We decided to set free shipping to $75", "Return policy is 30 days", "Discount will be 15%"
    if (
      lower.includes('we decided') ||
      lower.includes('decision:') ||
      lower.includes('agreed to') ||
      lower.includes('going forward, we will') ||
      lower.includes('policy:') ||
      lower.includes('rule:') ||
      lower.includes('free shipping') ||
      lower.includes('return policy') ||
      lower.includes('discount will be') ||
      lower.includes('pricing strategy')
    ) {
      let subTopic = 'general_policy';
      if (lower.includes('shipping')) subTopic = 'policy_shipping';
      else if (lower.includes('return')) subTopic = 'policy_returns';
      else if (lower.includes('discount') || lower.includes('pricing')) subTopic = 'policy_pricing';

      const isUpdate = lower.includes('updated') || lower.includes('changed') || lower.includes('revised') || lower.includes('new policy');
      return {
        classification: 'decision',
        tier: 'permanent',
        topicKey: subTopic,
        tags: ['policy', 'decision', 'operations', 'business_rules'],
        entities: ['Store Policy'],
        summary: `Store Policy: ${clean.slice(0, 100)}`,
        isUpdate,
        confidence: 0.96,
      };
    }

    // 5. Durable Store Facts & Knowledge
    // e.g. "Our store specializes in organic silk scarves", "Our primary supplier is Acme Fabrics", "Store hours are Monday to Saturday"
    if (
      lower.includes('our store specializes') ||
      lower.includes('we specialize in') ||
      lower.includes('supplier is') ||
      lower.includes('lead time is') ||
      lower.includes('store hours are') ||
      lower.includes('brand voice') ||
      lower.includes('target demographic') ||
      lower.includes('wholesale price')
    ) {
      return {
        classification: 'knowledge',
        tier: 'permanent',
        topicKey: 'store_knowledge',
        tags: ['knowledge', 'store_facts', 'operations'],
        entities: ['Store Knowledge'],
        summary: `Store Fact: ${clean.slice(0, 100)}`,
        isUpdate: lower.includes('changed') || lower.includes('new'),
        confidence: 0.95,
      };
    }

    // 6. Ongoing Tasks / Plans
    // e.g. "We are launching the summer collection next week", "Currently preparing for Black Friday audit"
    if (
      lower.includes('currently preparing') ||
      lower.includes('planning to launch') ||
      lower.includes('we are launching') ||
      lower.includes('upcoming campaign')
    ) {
      return {
        classification: 'context',
        tier: 'contextual',
        topicKey: 'ongoing_plan',
        tags: ['plan', 'campaign', 'context'],
        entities: ['Ongoing Task'],
        summary: `Ongoing Plan: ${clean.slice(0, 100)}`,
        isUpdate: false,
        confidence: 0.90,
      };
    }

    // 7. Creative & Studio Preferences (Image & Video styles, Aspect Ratios, Brand design constraints)
    // e.g. "For my images, I prefer cinematic lighting", "Use 16:9 aspect ratio for ads", "prefer photorealistic render style"
    if (
      lower.includes('aspect ratio') ||
      lower.includes('cinematic') ||
      lower.includes('photorealistic') ||
      lower.includes('minimalist') ||
      lower.includes('branding preference') ||
      lower.includes('render style') ||
      lower.includes('visual style') ||
      lower.includes('image preference') ||
      lower.includes('video preference') ||
      lower.includes('preferred style') ||
      lower.includes('brand voice')
    ) {
      return {
        classification: 'insight',
        tier: 'user',
        topicKey: 'creative_preference',
        tags: ['creative_preference', 'studio_preference', 'image_generation', 'video_generation', 'user_preference'],
        entities: ['Studio Creative Preferences'],
        summary: `Studio Creative Preference: ${clean.slice(0, 100)}`,
        isUpdate: lower.includes('changed') || lower.includes('instead') || lower.includes('from now on'),
        confidence: 0.95,
      };
    }

    return null;
  }

  // Evaluates an interaction and writes durable learnings into Second Brain memory
  public evaluateAndLearn(candidate: LearningCandidate): LearningResult {
    const { tenantId, userId, text, topicOrModule, businessContext } = candidate;

    if (!tenantId) {
      return { learned: false, reason: 'Missing tenantId' };
    }

    if (this.isTrivial(text)) {
      return { learned: false, reason: 'Ignored: Trivial message (greeting/closing/acknowledgement).' };
    }

    if (this.isGeneralInquiry(text)) {
      return { learned: false, reason: 'Ignored: General inquiry or query, not a declarative user memory.' };
    }

    const analysis = this.analyzeInteraction(text);
    if (!analysis) {
      return { learned: false, reason: 'Ignored: No persistent user context, decision, or business policy detected.' };
    }

    const { classification, tier, topicKey, tags, entities, summary, isUpdate, confidence } = analysis;

    // Check for existing memory on the same topicKey to update / supersede
    if (topicKey) {
      const existing = memoryService.findSuperseded(topicKey, tenantId, userId);
      if (existing) {
        // Track contradiction / revision if content changed significantly
        if (existing.content.trim().toLowerCase() !== text.trim().toLowerCase()) {
          contradictionService.detectOrRecord(
            tenantId,
            topicKey,
            existing.content,
            text.trim(),
            existing.updatedAt,
            new Date().toISOString(),
            existing.authority,
            candidate.speakerRole === 'user' ? 'USER_PROVIDED' : 'SYSTEM_GENERATED',
            existing.confidence,
            confidence,
            existing.source,
            `LearningEngine [${candidate.speakerRole}]`
          );
        }

        // Update the existing memory record with newest details (prevents duplicates & enforces newest info)
        const updatedItem = memoryService.update({
          id: existing.id,
          tenantId,
          userId: existing.userId || userId,
          content: text.trim(),
          summary: summary || text.slice(0, 100),
          classification,
          tier,
          tags: Array.from(new Set([...existing.tags, ...tags])),
          entities: Array.from(new Set([...existing.entities, ...entities])),
          authority: candidate.speakerRole === 'user' ? 'USER_PROVIDED' : 'SYSTEM_GENERATED',
          confidence,
          metadata: {
            ...existing.metadata,
            topicKey,
            lastUpdatedByRole: candidate.speakerRole,
            supersededPrevious: true,
            businessContext,
          },
        });

        logger.learn(tenantId, 'learning', 'UPDATE_EXISTING_KNOWLEDGE', {
          memoryId: updatedItem.id,
          topicKey,
          tier,
          textSnippet: text.slice(0, 60),
        });

        return {
          learned: true,
          reason: `Successfully updated existing ${topicKey} memory with latest user information.`,
          extractedClassification: classification,
          createdMemoryId: updatedItem.id,
        };
      }
    }

    // Store as new structured memory item
    const memoryItem = memoryService.store({
      tenantId,
      userId,
      tier,
      classification,
      content: text.trim(),
      summary: summary || topicOrModule || text.slice(0, 100),
      tags: Array.from(new Set([classification, ...(topicOrModule ? [topicOrModule] : []), ...tags])),
      entities,
      authority: candidate.speakerRole === 'user' ? 'USER_PROVIDED' : 'SYSTEM_GENERATED',
      confidence,
      source: `LearningEngine [${candidate.speakerRole}]`,
      provenance: topicOrModule ? `Module: ${topicOrModule}` : 'Chat interaction',
      metadata: {
        topicKey,
        speakerRole: candidate.speakerRole,
        businessContext,
      },
    });

    let createdWikiSlug: string | undefined;

    // If decision or crucial knowledge, create/update a Wiki page
    if (classification === 'decision' || classification === 'insight') {
      const title = `${classification.toUpperCase()} - ${topicKey || new Date().toISOString().slice(0, 10)} - ${text.slice(0, 30)}`;
      const doc = wikiService.saveDocument(
        classification === 'decision' ? 'decisions' : 'insights',
        title,
        text,
        {
          tenantId,
          userId,
          tags: [classification, ...(topicKey ? [topicKey] : [])],
          authority: candidate.speakerRole === 'user' ? 'USER_PROVIDED' : 'SYSTEM_GENERATED',
        }
      );
      createdWikiSlug = doc.slug;
    }

    logger.learn(tenantId, 'learning', 'LEARN_NEW_KNOWLEDGE', {
      memoryId: memoryItem.id,
      classification,
      tier,
      topicKey,
      createdWikiSlug,
      textSnippet: text.slice(0, 60),
    });

    return {
      learned: true,
      reason: `Successfully captured as ${tier} ${classification}.`,
      extractedClassification: classification,
      createdMemoryId: memoryItem.id,
      createdWikiSlug,
    };
  }
}

export const learningService = new LearningService();


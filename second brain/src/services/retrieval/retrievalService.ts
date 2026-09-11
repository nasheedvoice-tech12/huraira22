import {
  QueryOptions,
  MemoryItem,
  WikiDocument,
  ReasoningContext,
  ContradictionItem,
} from '../../types';
import { memoryService } from '../memory/memoryService';
import { wikiService } from '../indexing/wikiService';
import { relationshipGraphService } from '../relationships/relationshipGraph';
import { contradictionService } from '../contradiction/contradictionService';

export class RetrievalService {
  // Retrieve compact, highly relevant knowledge across all systems
  public retrieveContext(options: QueryOptions): ReasoningContext {
    const { query, tenantId, userId, limit = 8, minConfidence = 0.5 } = options;

    if (!tenantId) {
      return {
        answerContext: '',
        relevantMemories: [],
        relevantEntities: [],
        relevantConcepts: [],
        sources: [],
        contradictions: [],
        confidence: 0,
      };
    }

    // Build effective query with conversation context for resolving pronouns (e.g. "What should I do about it?")
    let effectiveQuery = query || '';
    if (options.conversationHistory && Array.isArray(options.conversationHistory) && options.conversationHistory.length > 0) {
      const recentTurns = options.conversationHistory.slice(-4).map((t: any) => t.content || t.text || '').join(' ');
      if (recentTurns.trim()) {
        effectiveQuery = `${effectiveQuery} ${recentTurns}`.trim();
      }
    }

    // 1. Query structured Memories
    const memories = memoryService.query({
      query: effectiveQuery,
      tenantId,
      userId,
      limit: Math.min(limit, 10),
      minConfidence,
      includeStale: false,
    });

    // 2. Query Wiki Documents (Entities, Concepts, Topics, Decisions, Insights)
    const wikiEntities = wikiService.search(effectiveQuery, tenantId, 'entities', 4);
    const wikiConcepts = wikiService.search(effectiveQuery, tenantId, 'concepts', 4);
    const wikiDecisions = wikiService.search(effectiveQuery, tenantId, 'decisions', 3);
    const wikiInsights = wikiService.search(effectiveQuery, tenantId, 'insights', 3);
    const wikiTopics = wikiService.search(effectiveQuery, tenantId, 'topics', 4);

    const combinedWiki = [
      ...wikiEntities,
      ...wikiConcepts,
      ...wikiDecisions,
      ...wikiInsights,
      ...wikiTopics,
    ];

    // Deduplicate Wiki documents by ID
    const uniqueWikiMap = new Map<string, WikiDocument>();
    combinedWiki.forEach(doc => uniqueWikiMap.set(doc.id, doc));
    const allRelevantWiki = Array.from(uniqueWikiMap.values()).slice(0, 10);

    // 3. Extract relevant Entity & Concept nodes
    const relevantEntities = allRelevantWiki.filter(w => w.category === 'entities');
    const relevantConcepts = allRelevantWiki.filter(w => w.category === 'concepts' || w.category === 'topics');

    // 4. Query Contradictions for this query topic
    const contradictions = contradictionService.getForTopic(query, tenantId);

    // 5. Expand Relationship Graph based on retrieved seeds
    const seedIds: string[] = [
      ...memories.flatMap(m => m.entities.map(e => wikiService.slugify(e))),
      ...allRelevantWiki.map(w => w.slug),
    ].slice(0, 6);

    const graphExpansion =
      seedIds.length > 0
        ? relationshipGraphService.expandGraph(seedIds, tenantId, 2, 20)
        : undefined;

    // 6. Assemble Compact Answer Context text (Optimized for LLM context windows)
    const contextSections: string[] = [];

    const userMemories = memories.filter(m => m.tier === 'user' || m.tags.includes('preference') || m.tags.includes('goal') || m.tags.includes('project'));
    const businessMemories = memories.filter(m => !userMemories.includes(m));

    if (userMemories.length > 0) {
      contextSections.push('### 👤 Relevant User Memories, Goals & Projects (From Second Brain):');
      userMemories.forEach(m => {
        contextSections.push(`- **${m.classification.toUpperCase()}**: ${m.content}`);
      });
    }

    if (businessMemories.length > 0) {
      contextSections.push('\n### 🏛️ Verified Store Policies & Business Knowledge:');
      businessMemories.forEach(m => {
        const authTag = m.authority ? ` [${m.authority}]` : '';
        contextSections.push(`- **${m.classification.toUpperCase()}**${authTag}: ${m.content}`);
      });
    }

    if (allRelevantWiki.length > 0) {
      contextSections.push('\n### 📚 Knowledge Wiki & Strategic Decisions:');
      allRelevantWiki.forEach(w => {
        contextSections.push(`- **[[${w.title}]]** (${w.category}): ${w.content.slice(0, 280).replace(/\n+/g, ' ')}...`);
      });
    }

    if (contradictions.length > 0) {
      contextSections.push('\n### ⚠️ Active Knowledge Contradictions:');
      contradictions.forEach(c => {
        contextSections.push(`- Conflict on topic "${c.topic}": Claim A (${c.oldAuthority}): "${c.oldClaim}" vs Claim B (${c.newAuthority}): "${c.newClaim}" [Status: ${c.status}]`);
      });
    }

    // Collect all Unique Sources & Provenances
    const sourcesSet = new Set<string>();
    memories.forEach(m => {
      if (m.source) sourcesSet.add(m.source);
      if (m.provenance) sourcesSet.add(m.provenance);
    });
    allRelevantWiki.forEach(w => {
      if (w.frontmatter.source) sourcesSet.add(w.frontmatter.source);
      if (w.frontmatter.provenance) sourcesSet.add(w.frontmatter.provenance);
    });

    const sources = Array.from(sourcesSet);

    // Compute Overall Confidence Score
    let avgConfidence = 0.9;
    if (memories.length > 0) {
      const sum = memories.reduce((acc, m) => acc + m.confidence, 0);
      avgConfidence = sum / memories.length;
    }
    if (contradictions.filter(c => c.status === 'unresolved').length > 0) {
      avgConfidence = Math.max(0.4, avgConfidence - 0.25); // Penalize confidence if unresolved contradiction exists
    }

    return {
      answerContext: contextSections.join('\n'),
      relevantMemories: memories,
      relevantEntities,
      relevantConcepts,
      sources,
      contradictions,
      confidence: Math.round(avgConfidence * 100) / 100,
      graphExpansion,
    };
  }

  // Full-text and metadata search
  public search(
    query: string,
    tenantId: string,
    userId?: string | null,
    limit: number = 15
  ): {
    memories: MemoryItem[];
    wikiDocuments: WikiDocument[];
    contradictions: ContradictionItem[];
    totalCount: number;
  } {
    const memories = memoryService.query({ query, tenantId, userId, limit });
    const wikiDocuments = wikiService.search(query, tenantId, undefined, limit);
    const contradictions = contradictionService.getForTopic(query, tenantId);

    return {
      memories,
      wikiDocuments,
      contradictions,
      totalCount: memories.length + wikiDocuments.length + contradictions.length,
    };
  }
}

export const retrievalService = new RetrievalService();

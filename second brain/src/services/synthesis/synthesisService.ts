import { WikiDocument } from '../../types';
import { memoryService } from '../memory/memoryService';
import { wikiService } from '../indexing/wikiService';
import { logger } from '../logging/logger';

export class SynthesisService {
  // Aggregate multi-source memories and wiki entries into a structured topic synthesis
  public synthesizeTopic(
    tenantId: string,
    topic: string,
    userId?: string | null
  ): WikiDocument {
    if (!tenantId) throw new Error('Tenant ID required for synthesis.');

    const memories = memoryService.query({ query: topic, tenantId, userId, limit: 15 });
    const wikiPages = wikiService.search(topic, tenantId, undefined, 8);

    const decisions = memories.filter(m => m.classification === 'decision');
    const insights = memories.filter(m => m.classification === 'insight');
    const facts = memories.filter(m => m.classification === 'knowledge' || m.classification === 'memory');

    let markdown = `# Strategic Synthesis: ${topic}\n\n`;
    markdown += `*Generated automatically by Velcora Second Brain Synthesis Engine on ${new Date().toLocaleDateString()}*\n\n`;

    if (decisions.length > 0) {
      markdown += `## 🎯 Historical Decisions\n`;
      decisions.forEach(d => {
        markdown += `- **${d.summary || 'Decision'}**: ${d.content} *(Authority: ${d.authority})*\n`;
      });
      markdown += `\n`;
    }

    if (insights.length > 0) {
      markdown += `## 💡 Key Business Insights\n`;
      insights.forEach(ins => {
        markdown += `- ${ins.content} *(Confidence: ${ins.confidence * 100}%)\n`;
      });
      markdown += `\n`;
    }

    if (facts.length > 0) {
      markdown += `## 📊 Verified Business Facts\n`;
      facts.forEach(f => {
        markdown += `- ${f.content}\n`;
      });
      markdown += `\n`;
    }

    if (wikiPages.length > 0) {
      markdown += `## 🔗 Connected Wiki References\n`;
      wikiPages.forEach(p => {
        markdown += `- [[${p.title}]] (${p.category}): ${p.content.slice(0, 120).replace(/\n+/g, ' ')}...\n`;
      });
      markdown += `\n`;
    }

    const title = `Synthesis - ${topic}`;
    const doc = wikiService.saveDocument('syntheses', title, markdown, {
      tenantId,
      userId,
      tags: ['synthesis', topic.toLowerCase()],
      authority: 'SYSTEM_GENERATED',
      confidence: 0.95,
      source: 'Second Brain Synthesis Engine',
      provenance: `Synthesized from ${memories.length} memories & ${wikiPages.length} wiki references`,
    });

    logger.learn(tenantId, 'synthesis', 'SYNTHESIZE_TOPIC', {
      topic,
      slug: doc.slug,
      memoriesUsed: memories.length,
      wikiPagesUsed: wikiPages.length,
    });

    return doc;
  }
}

export const synthesisService = new SynthesisService();

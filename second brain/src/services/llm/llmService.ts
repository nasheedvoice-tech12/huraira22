import { GoogleGenAI } from '@google/genai';
import { KnowledgeAuthority, MemoryClassification } from '../../types';
import { logger } from '../logging/logger';

export class BrainLLMService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  // Extract structured insights & wikilinks with fast local heuristic + live Gemini model enhancement
  public async extractKnowledgeEntities(text: string): Promise<{
    entities: string[];
    concepts: string[];
    classification: MemoryClassification;
    summary: string;
  }> {
    // 1. Fast heuristic extraction (always works offline)
    const wikilinkMatches = text.match(/\[\[(.*?)\]\]/g) || [];
    const wikilinks = wikilinkMatches.map(m => m.replace(/^\[\[|\]\]$/g, '').split('|')[0].trim());

    const capitalWords = text.match(/\b[A-Z][a-zA-Z0-9_-]{2,}\b/g) || [];
    const heuristicEntities = Array.from(new Set([...wikilinks, ...capitalWords])).slice(0, 10);

    let result = {
      entities: heuristicEntities,
      concepts: ['business_operations', 'retail'],
      classification: 'knowledge' as MemoryClassification,
      summary: text.slice(0, 120),
    };

    if (this.ai) {
      try {
        const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
        for (const model of models) {
          try {
            const prompt = `You are Velcora Second Brain knowledge extractor.
Analyze this business text and extract JSON:
{
  "entities": ["list of key products, vendors, locations, or people"],
  "concepts": ["list of operational concepts e.g. inventory, pricing, trend"],
  "classification": "decision" | "fact" | "preference" | "knowledge",
  "summary": "Concise 1-sentence summary"
}

Text:
"${text.slice(0, 1000)}"`;

            const res = await this.ai.models.generateContent({
              model,
              contents: prompt,
              config: { responseMimeType: 'application/json' }
            });

            if (res && res.text) {
              const parsed = JSON.parse(res.text);
              if (parsed) {
                if (Array.isArray(parsed.entities) && parsed.entities.length > 0) {
                  result.entities = Array.from(new Set([...heuristicEntities, ...parsed.entities])).slice(0, 12);
                }
                if (Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
                  result.concepts = parsed.concepts;
                }
                if (['decision', 'fact', 'preference', 'knowledge'].includes(parsed.classification)) {
                  result.classification = parsed.classification as MemoryClassification;
                }
                if (parsed.summary && typeof parsed.summary === 'string') {
                  result.summary = parsed.summary;
                }
                break;
              }
            }
          } catch (_) {}
        }
      } catch (err) {
        logger.info('default', 'llm', 'EXTRACT_FALLBACK', { error: String(err) });
      }
    }

    return result;
  }
}

export const brainLLMService = new BrainLLMService();

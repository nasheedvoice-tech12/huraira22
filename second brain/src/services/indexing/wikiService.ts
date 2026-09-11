import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  WikiDocument,
  WikiFrontmatter,
  WikiCategory,
  KnowledgeAuthority,
  UUID,
} from '../../types';
import { logger } from '../logging/logger';

export class WikiService {
  private baseDir: string;
  private categoryDirs: Record<WikiCategory, string>;
  private docCache: Map<string, WikiDocument> = new Map(); // key: slug/id
  private backlinksGraph: Map<string, Set<string>> = new Map(); // target -> set of source slugs

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'second brain/wiki');
    this.categoryDirs = {
      entities: path.join(this.baseDir, 'entities'),
      concepts: path.join(this.baseDir, 'concepts'),
      topics: path.join(this.baseDir, 'topics'),
      decisions: path.join(this.baseDir, 'decisions'),
      insights: path.join(this.baseDir, 'insights'),
      sources: path.join(this.baseDir, 'sources'),
      syntheses: path.join(this.baseDir, 'syntheses'),
      conversations: path.join(this.baseDir, 'conversations'),
    };
    this.ensureDirs();
    this.reloadAll();
  }

  private ensureDirs() {
    try {
      Object.values(this.categoryDirs).forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
    } catch (e) {
      // safe fallback
    }
  }

  public slugify(titleOrName: string): string {
    return titleOrName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled';
  }

  // Extracts [[WikiLink]] or [[Target|Alias]] or [[category:Target]] from markdown text
  public extractWikilinks(text: string): string[] {
    if (!text) return [];
    const regex = /\[\[(.*?)\]\]/g;
    const links: Set<string> = new Set();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const rawTarget = match[1].trim();
      if (rawTarget) {
        // Handle alias: [[Target Page|Display Text]]
        const target = rawTarget.split('|')[0].trim();
        // Remove optional category prefix: [[entity:My Product]] -> My Product
        const cleanTarget = target.includes(':') ? target.split(':')[1].trim() : target;
        if (cleanTarget) {
          links.add(cleanTarget);
        }
      }
    }

    return Array.from(links);
  }

  public reloadAll() {
    this.docCache.clear();
    this.backlinksGraph.clear();
    this.ensureDirs();

    const allDocs: WikiDocument[] = [];

    (Object.keys(this.categoryDirs) as WikiCategory[]).forEach(cat => {
      const dir = this.categoryDirs[cat];
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          if (file.endsWith('.md')) {
            try {
              const fullPath = path.join(dir, file);
              const raw = fs.readFileSync(fullPath, 'utf8');
              const parsed = matter(raw);

              const title = parsed.data.title || file.replace(/\.md$/, '').replace(/-/g, ' ');
              const slug = this.slugify(parsed.data.id || title);
              const wikilinks = this.extractWikilinks(parsed.content);

              const frontmatter: WikiFrontmatter = {
                id: parsed.data.id || slug,
                title,
                category: cat,
                tenantId: parsed.data.tenantId || parsed.data.tenant_id || 'global',
                userId: parsed.data.userId || parsed.data.user_id || null,
                tags: parsed.data.tags || [],
                aliases: parsed.data.aliases || [],
                authority: parsed.data.authority || 'SYSTEM_GENERATED',
                confidence: typeof parsed.data.confidence === 'number' ? parsed.data.confidence : 1.0,
                status: parsed.data.status || 'active',
                source: parsed.data.source || parsed.data.provenance || 'system',
                provenance: parsed.data.provenance || parsed.data.source || 'wiki',
                createdAt: parsed.data.createdAt || parsed.data.created || new Date().toISOString(),
                updatedAt: parsed.data.updatedAt || parsed.data.updated || new Date().toISOString(),
                relatedWikilinks: wikilinks,
                ...parsed.data,
              };

              const doc: WikiDocument = {
                id: frontmatter.id,
                title,
                slug,
                category: cat,
                filePath: fullPath,
                frontmatter,
                content: parsed.content,
                rawContent: raw,
                wikilinks,
                backlinks: [],
              };

              this.docCache.set(slug, doc);
              this.docCache.set(doc.id, doc);
              allDocs.push(doc);
            } catch (err) {
              console.warn(`[WikiService] Error parsing ${file}:`, err);
            }
          }
        });
      }
    });

    // Compute Backlinks
    allDocs.forEach(doc => {
      doc.wikilinks.forEach(targetName => {
        const targetSlug = this.slugify(targetName);
        if (!this.backlinksGraph.has(targetSlug)) {
          this.backlinksGraph.set(targetSlug, new Set());
        }
        this.backlinksGraph.get(targetSlug)!.add(doc.slug);
      });
    });

    // Populate backlinks in documents
    allDocs.forEach(doc => {
      const set = this.backlinksGraph.get(doc.slug);
      if (set) {
        doc.backlinks = Array.from(set);
      }
    });
  }

  public saveDocument(
    category: WikiCategory,
    title: string,
    content: string,
    metadata: Partial<WikiFrontmatter> & { tenantId: string }
  ): WikiDocument {
    if (!metadata.tenantId) {
      throw new Error('Tenant ID is required for wiki document.');
    }

    const slug = this.slugify(title);
    const now = new Date().toISOString();
    const id = metadata.id || slug;
    const wikilinks = this.extractWikilinks(content);

    const rawFrontmatter: Record<string, any> = {
      id,
      title,
      category,
      tenantId: metadata.tenantId,
      userId: metadata.userId || null,
      tags: metadata.tags || [],
      aliases: metadata.aliases || [],
      authority: metadata.authority || 'PRIMARY',
      confidence: metadata.confidence ?? 1.0,
      status: metadata.status || 'active',
      source: metadata.source || 'Velcora Brain Ingestion',
      provenance: metadata.provenance || 'Second Brain Wiki Engine',
      createdAt: metadata.createdAt || now,
      updatedAt: now,
      relatedWikilinks: wikilinks,
      ...metadata,
    };

    // Clean any undefined fields so YAML serializer won't throw
    const frontmatter: any = {};
    Object.keys(rawFrontmatter).forEach(key => {
      if (rawFrontmatter[key] !== undefined) {
        frontmatter[key] = rawFrontmatter[key];
      }
    });

    const fileContent = matter.stringify(content, frontmatter);
    const filePath = path.join(this.categoryDirs[category], `${slug}.md`);

    this.ensureDirs();
    fs.writeFileSync(filePath, fileContent, 'utf8');

    const doc: WikiDocument = {
      id,
      title,
      slug,
      category,
      filePath,
      frontmatter,
      content,
      rawContent: fileContent,
      wikilinks,
      backlinks: Array.from(this.backlinksGraph.get(slug) || []),
    };

    this.docCache.set(slug, doc);
    this.docCache.set(id, doc);

    // Update backlinks graph
    wikilinks.forEach(target => {
      const tSlug = this.slugify(target);
      if (!this.backlinksGraph.has(tSlug)) {
        this.backlinksGraph.set(tSlug, new Set());
      }
      this.backlinksGraph.get(tSlug)!.add(slug);
    });

    logger.audit(metadata.tenantId, 'wiki', 'SAVE_DOCUMENT', {
      category,
      slug,
      title,
      wikilinksCount: wikilinks.length,
    });

    return doc;
  }

  public getBySlugOrId(identifier: string, tenantId: string): WikiDocument | null {
    const slug = this.slugify(identifier);
    const doc = this.docCache.get(identifier) || this.docCache.get(slug);
    if (!doc) return null;
    if (doc.frontmatter.tenantId !== tenantId && doc.frontmatter.tenantId !== 'global') {
      return null; // Tenant isolation
    }
    return doc;
  }

  public search(
    query: string,
    tenantId: string,
    category?: WikiCategory,
    limit: number = 10
  ): WikiDocument[] {
    const rawTokens = (query || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);

    const stopwords = new Set([
      'a', 'about', 'all', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'could', 'do',
      'does', 'for', 'from', 'had', 'has', 'have', 'how', 'i', 'if', 'in', 'is', 'it', 'me',
      'my', 'no', 'not', 'of', 'on', 'or', 'our', 'should', 'so', 'that', 'the', 'their',
      'this', 'to', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will',
      'with', 'would', 'you', 'your', 'tell', 'explain'
    ]);

    const terms = rawTokens.filter(t => !stopwords.has(t));

    const scored: Array<{ doc: WikiDocument; score: number }> = [];
    const seen = new Set<string>();

    for (const doc of this.docCache.values()) {
      if (seen.has(doc.filePath)) continue;
      seen.add(doc.filePath);

      if (doc.frontmatter.tenantId !== tenantId && doc.frontmatter.tenantId !== 'global') continue;
      if (category && doc.category !== category) continue;
      if (doc.frontmatter.status === 'archived' || doc.frontmatter.status === 'deprecated') continue;

      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      const tagsLower = (doc.frontmatter.tags || []).map(t => t.toLowerCase());

      if (!query || query.trim().length === 0) {
        score = 1.0;
      } else if (terms.length === 0) {
        if (titleLower.includes(query.toLowerCase().trim()) || contentLower.includes(query.toLowerCase().trim())) {
          score += 4.0;
        }
      } else {
        let matched = 0;
        terms.forEach(term => {
          let termHit = false;
          if (titleLower.includes(term)) { score += 6.0; termHit = true; }
          if (contentLower.includes(term)) { score += 2.5; termHit = true; }
          if (tagsLower.some(t => t.includes(term))) { score += 3.5; termHit = true; }
          if (doc.wikilinks.some(w => w.toLowerCase().includes(term))) { score += 3.0; termHit = true; }
          if (termHit) matched++;
        });

        if (query && (titleLower.includes(query.toLowerCase().trim()) || contentLower.includes(query.toLowerCase().trim()))) {
          score += 6.0;
        }

        if (matched === 0 && !titleLower.includes(query.toLowerCase().trim()) && !contentLower.includes(query.toLowerCase().trim())) {
          score = 0;
        }
      }

      if (score > 0) {
        if (doc.frontmatter.authority === 'PRIMARY') score *= 1.4;
        if (doc.backlinks.length > 0) score += doc.backlinks.length * 0.5; // Popular hub pages boost
        score *= (doc.frontmatter.confidence ?? 1.0);
        scored.push({ doc, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.doc);
  }

  public getAllDocuments(tenantId: string): WikiDocument[] {
    const unique = new Map<string, WikiDocument>();
    for (const doc of this.docCache.values()) {
      if (doc.frontmatter.tenantId === tenantId || doc.frontmatter.tenantId === 'global') {
        unique.set(doc.filePath, doc);
      }
    }
    return Array.from(unique.values());
  }

  public getBacklinks(identifier: string, tenantId: string): WikiDocument[] {
    const slug = this.slugify(identifier);
    const linkingSlugs = this.backlinksGraph.get(slug);
    if (!linkingSlugs) return [];

    const results: WikiDocument[] = [];
    linkingSlugs.forEach(s => {
      const doc = this.getBySlugOrId(s, tenantId);
      if (doc) results.push(doc);
    });
    return results;
  }

  public count(tenantId?: string): number {
    if (!tenantId) {
      const unique = new Set(Array.from(this.docCache.values()).map(d => d.filePath));
      return unique.size;
    }
    return this.getAllDocuments(tenantId).length;
  }
}

export const wikiService = new WikiService();

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { LintReport, LintError, LintWarning, WikiCategory } from '../../types';
import { wikiService } from '../indexing/wikiService';
import { memoryService } from '../memory/memoryService';
import { contradictionService } from '../contradiction/contradictionService';
import { relationshipGraphService } from '../relationships/relationshipGraph';
import { logger } from '../logging/logger';

export class HealthLintService {
  public runLint(tenantId?: string): LintReport {
    const errors: LintError[] = [];
    const warnings: LintWarning[] = [];

    // 1. Reload Wiki & Memory caches to inspect actual files
    wikiService.reloadAll();
    memoryService.loadAllFromDisk();
    const staleResult = memoryService.cleanStale();

    const allWikiDocs = wikiService.getAllDocuments(tenantId || 'global');
    const allMemories = tenantId ? memoryService.getAllForTenant(tenantId) : (memoryService as any).cache ? Array.from((memoryService as any).cache.values()) : [];
    const allContradictions = contradictionService.getAll(tenantId || 'global');

    // Create a lookup set of valid slugs/titles/IDs
    const validWikiSlugs = new Set<string>();
    allWikiDocs.forEach(d => {
      validWikiSlugs.add(d.slug);
      validWikiSlugs.add(wikiService.slugify(d.title));
      validWikiSlugs.add(d.id);
      (d.frontmatter.aliases || []).forEach(a => validWikiSlugs.add(wikiService.slugify(a)));
    });

    let brokenWikilinksCount = 0;
    let orphanPagesCount = 0;
    let malformedFrontmatterCount = 0;

    // 2. Validate Wiki Documents
    allWikiDocs.forEach(doc => {
      // Check broken wikilinks
      doc.wikilinks.forEach(target => {
        const targetSlug = wikiService.slugify(target);
        if (!validWikiSlugs.has(targetSlug)) {
          brokenWikilinksCount++;
          errors.push({
            type: 'broken_wikilink',
            message: `Document "${doc.title}" contains broken [[wikilink]] to missing target: "[[${target}]]"`,
            filePath: doc.filePath,
            docId: doc.id,
            details: { target, targetSlug },
          });
        }
      });

      // Check orphan pages (no outgoing links AND no incoming backlinks, except in sources/syntheses)
      if (
        doc.wikilinks.length === 0 &&
        doc.backlinks.length === 0 &&
        doc.category !== 'sources' &&
        doc.category !== 'conversations'
      ) {
        orphanPagesCount++;
        warnings.push({
          type: 'orphan_page',
          message: `Wiki page "${doc.title}" is an orphan (has 0 outgoing wikilinks and 0 backlinks).`,
          filePath: doc.filePath,
          docId: doc.id,
        });
      }

      // Validate frontmatter structure
      if (!doc.frontmatter.title || !doc.frontmatter.category || !doc.frontmatter.tenantId) {
        malformedFrontmatterCount++;
        errors.push({
          type: 'malformed_frontmatter',
          message: `Document "${doc.id}" is missing required frontmatter properties (title, category, or tenantId).`,
          filePath: doc.filePath,
          docId: doc.id,
        });
      }
    });

    // 3. Validate Memory Classifications & Status
    const validClassifications = new Set(['temporary', 'context', 'memory', 'knowledge', 'decision', 'insight']);
    allMemories.forEach((mem: any) => {
      if (!validClassifications.has(mem.classification)) {
        errors.push({
          type: 'invalid_classification',
          message: `Memory item "${mem.id}" has invalid classification: "${mem.classification}"`,
          docId: mem.id,
        });
      }

      if (mem.confidence < 0.3) {
        warnings.push({
          type: 'low_confidence',
          message: `Memory item "${mem.id}" has very low confidence score (${mem.confidence}).`,
          docId: mem.id,
        });
      }
    });

    // 4. Validate Contradictions
    const unresolvedContradictions = allContradictions.filter(c => c.status === 'unresolved');
    unresolvedContradictions.forEach(c => {
      warnings.push({
        type: 'unresolved_contradiction',
        message: `Active unresolved contradiction on topic "${c.topic}" between "${c.oldClaim.slice(0, 40)}" and "${c.newClaim.slice(0, 40)}"`,
        docId: c.id,
      });
    });

    // 5. Stale Memories warning
    if (staleResult.cleanedCount > 0) {
      warnings.push({
        type: 'stale_memory',
        message: `${staleResult.cleanedCount} temporary memories have expired and were marked stale.`,
      });
    }

    const report: LintReport = {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalMemories: allMemories.length,
        totalWikiPages: allWikiDocs.length,
        totalRelationships: relationshipGraphService.count(tenantId),
        brokenWikilinks: brokenWikilinksCount,
        orphanPages: orphanPagesCount,
        unindexedPages: 0,
        contradictionsCount: allContradictions.length,
        staleMemoriesCount: staleResult.cleanedCount,
        malformedFrontmatterCount,
      },
      generatedAt: new Date().toISOString(),
    };

    logger.info(tenantId || 'global', 'lint', 'HEALTH_CHECK_COMPLETED', {
      valid: report.valid,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      stats: report.stats,
    });

    return report;
  }
}

export const healthLintService = new HealthLintService();

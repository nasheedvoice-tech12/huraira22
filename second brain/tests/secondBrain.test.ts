import { describe, it, expect, beforeEach } from 'vitest';
import { memoryService } from '../src/services/memory/memoryService';
import { wikiService } from '../src/services/indexing/wikiService';
import { contradictionService } from '../src/services/contradiction/contradictionService';
import { learningService } from '../src/services/learning/learningService';
import { healthLintService } from '../src/services/lint/healthLintService';
import { reasoningEngine } from '../src/services/reasoning/reasoningEngine';
import { relationshipGraphService } from '../src/services/relationships/relationshipGraph';

describe('Velcora Second Brain Core Subsystems', () => {
  const testTenant = 'test-tenant-99';
  const otherTenant = 'test-tenant-100';

  it('Memory Service: stores, queries, and enforces tenant isolation', () => {
    const mem1 = memoryService.store({
      tenantId: testTenant,
      content: 'Store operating hours are Monday through Saturday 9am to 9pm.',
      classification: 'knowledge',
      tier: 'permanent',
      authority: 'PRIMARY',
      tags: ['operations', 'hours'],
      entities: ['Store Schedule'],
    });

    expect(mem1).toBeDefined();
    expect(mem1.id).toBeDefined();

    // Query in same tenant
    const found = memoryService.query({
      query: 'operating hours',
      tenantId: testTenant,
    });
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].content).toContain('operating hours');

    // Query in different tenant must return 0 results (Strict Isolation)
    const isolated = memoryService.query({
      query: 'operating hours',
      tenantId: otherTenant,
    });
    expect(isolated.length).toBe(0);
  });

  it('Memory Service: prevents duplicate spam by updating existing item', () => {
    const first = memoryService.store({
      tenantId: testTenant,
      content: 'Apex Boutique premium loyalty discount is exactly 15%.',
      classification: 'decision',
      tier: 'permanent',
    });

    const duplicate = memoryService.store({
      tenantId: testTenant,
      content: 'Apex Boutique premium loyalty discount is exactly 15%.',
      classification: 'decision',
      tier: 'permanent',
    });

    expect(duplicate.id).toBe(first.id);
  });

  it('Wiki Service: handles [[wikilinks]], markdown frontmatter, and backlinks', () => {
    const docA = wikiService.saveDocument(
      'entities',
      'Velcora Silk Scarf',
      'The [[Velcora Silk Scarf]] is paired with the [[Leather Tote Bag]] for spring promotions.',
      { tenantId: testTenant, tags: ['product', 'spring'] }
    );

    const docB = wikiService.saveDocument(
      'entities',
      'Leather Tote Bag',
      'The [[Leather Tote Bag]] is crafted from Italian leather.',
      { tenantId: testTenant, tags: ['product', 'accessories'] }
    );

    expect(docA.wikilinks).toContain('Leather Tote Bag');
    wikiService.reloadAll();

    const backlinks = wikiService.getBacklinks('Leather Tote Bag', testTenant);
    expect(backlinks.some(b => b.title === 'Velcora Silk Scarf')).toBe(true);
  });

  it('Contradiction Service: preserves conflicting claims without silent overwrite', () => {
    const item = contradictionService.detectOrRecord(
      testTenant,
      'Q3 Sales Goal',
      'Target is $100,000 top-line revenue.',
      'Revised target is $150,000 top-line revenue.',
      '2026-08-01T00:00:00Z',
      '2026-08-15T00:00:00Z',
      'SECONDARY',
      'PRIMARY',
      0.8,
      0.95,
      'Meeting Notes A',
      'Executive Directive B'
    );

    expect(item).toBeDefined();
    expect(item.status).toBe('unresolved');

    const retrieved = contradictionService.getForTopic('Q3 Sales Goal', testTenant);
    expect(retrieved.length).toBeGreaterThan(0);
    expect(retrieved[0].oldClaim).toContain('$100,000');
    expect(retrieved[0].newClaim).toContain('$150,000');
  });

  it('Learning Service: filters out trivial messages and captures durable knowledge', () => {
    // Trivial messages should be discarded
    const resTrivial1 = learningService.evaluateAndLearn({
      tenantId: testTenant,
      text: 'hello there!',
      speakerRole: 'user',
    });
    expect(resTrivial1.learned).toBe(false);

    const resTrivial2 = learningService.evaluateAndLearn({
      tenantId: testTenant,
      text: 'ok thanks bye',
      speakerRole: 'user',
    });
    expect(resTrivial2.learned).toBe(false);

    // Decisions and facts should be captured
    const resDecision = learningService.evaluateAndLearn({
      tenantId: testTenant,
      text: 'We decided to set the minimum order value for free delivery to $75 going forward.',
      speakerRole: 'user',
      topicOrModule: 'Shipping Policy',
    });
    expect(resDecision.learned).toBe(true);
    expect(resDecision.extractedClassification).toBe('decision');
  });

  it('Reasoning Engine: builds structured grounding context for LLM', () => {
    const ctx = reasoningEngine.buildContext({
      query: 'delivery free minimum order',
      tenantId: testTenant,
    });

    expect(ctx.answerContext).toBeDefined();
    expect(ctx.confidence).toBeGreaterThan(0);
  });

  it('Health Lint: generates comprehensive diagnostics report', () => {
    const report = healthLintService.runLint(testTenant);
    expect(report).toBeDefined();
    expect(report.stats.totalMemories).toBeGreaterThan(0);
    expect(typeof report.valid).toBe('boolean');
  });
});

import { Command } from 'commander';
import { ingestionService } from '../services/ingestion/ingestionService';
import { memoryService } from '../services/memory/memoryService';
import { retrievalService } from '../services/retrieval/retrievalService';
import { reasoningEngine } from '../services/reasoning/reasoningEngine';
import { healthLintService } from '../services/lint/healthLintService';
import { synthesisService } from '../services/synthesis/synthesisService';

const program = new Command();

program
  .name('velcora-brain')
  .description('Velcora Second Brain Standalone CLI Management Tool')
  .version('1.0.0');

// Store memory
program
  .command('store')
  .description('Store a verified memory item')
  .requiredOption('-c, --content <text>', 'Memory content')
  .option('-t, --tenant <id>', 'Tenant ID', 'velcora-default-store')
  .option('-k, --classification <type>', 'Classification', 'knowledge')
  .option('--tier <tier>', 'Tier', 'contextual')
  .action((options) => {
    const memory = memoryService.store({
      tenantId: options.tenant,
      content: options.content,
      classification: options.classification as any,
      tier: options.tier as any,
    });
    console.log('✅ Memory Stored:', memory);
  });

// Query / Context
program
  .command('context')
  .description('Retrieve reasoning context for a query')
  .argument('<query>', 'Search query')
  .option('-t, --tenant <id>', 'Tenant ID', 'velcora-default-store')
  .action((query, options) => {
    const ctx = reasoningEngine.buildContext({
      query,
      tenantId: options.tenant,
    });
    console.log('🧠 Context Result:');
    console.log(ctx.answerContext);
    console.log('\nConfidence:', ctx.confidence);
  });

// Health Lint
program
  .command('lint')
  .description('Run health and integrity lint across all wiki and memory pages')
  .option('-t, --tenant <id>', 'Tenant ID')
  .action((options) => {
    const report = healthLintService.runLint(options.tenant);
    console.log('📋 Velcora Second Brain Health Report:');
    console.log(`Valid: ${report.valid ? '✅ YES' : '❌ NO'}`);
    console.log(`Errors: ${report.errors.length}`);
    console.log(`Warnings: ${report.warnings.length}`);
    console.log('Stats:', report.stats);
    if (report.errors.length > 0) {
      console.log('Errors:', report.errors);
    }
  });

// Synthesize
program
  .command('synthesize')
  .description('Synthesize memories into a strategic wiki document')
  .argument('<topic>', 'Topic to synthesize')
  .option('-t, --tenant <id>', 'Tenant ID', 'velcora-default-store')
  .action((topic, options) => {
    const doc = synthesisService.synthesizeTopic(options.tenant, topic);
    console.log(`✨ Synthesized Wiki Document: ${doc.title} (${doc.slug})`);
  });

program.parse(process.argv);

import { build } from 'esbuild';

async function bundleServer() {
  try {
    console.log('[Build] Bundling server.ts into dist/server.cjs for production server runtime...');
    // NOTE: We intentionally bundle dependencies (no `packages: 'external'`).
    // Vercel's Node runtime cannot require() ESM-only packages (uuid@14,
    // @google/genai, zod, commander) and fails with ERR_REQUIRE_ESM. Inlining
    // everything into the CJS output removes that failure mode.
    await build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      sourcemap: true,
      outfile: 'dist/server.cjs',
    });
    console.log('[Build] Server bundle dist/server.cjs generated successfully.');
  } catch (err) {
    console.error('[Build] Error compiling server.ts:', err);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

bundleServer();


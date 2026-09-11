import { build } from 'esbuild';

async function bundleServer() {
  try {
    console.log('[Build] Bundling server.ts into dist/server.cjs for production server runtime...');
    await build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      packages: 'external',
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

import { createRequire } from 'node:module';

// ---------------------------------------------------------------------------
// Vercel Serverless entry (replaces Firebase Cloud Functions — no Blaze needed)
//
// The Express app is shipped as a self-contained CommonJS bundle
// (dist/server.cjs) produced by `npm run build`. We load it with a real CJS
// `require` so we do NOT depend on ESM resolving extensionless TS imports at
// runtime (which fails on Vercel with `ERR_MODULE_NOT_FOUND`).
// ---------------------------------------------------------------------------
const nodeRequire = createRequire(import.meta.url);
const serverModule: any = nodeRequire('../dist/server.cjs');
const app = serverModule?.default || serverModule?.app || serverModule;

export default function handler(req: any, res: any) {
  return app(req, res);
}

export { app };


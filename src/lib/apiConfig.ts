/**
 * Velcora Production API Gateway & Configuration
 * 
 * Safely resolves base API endpoints across:
 * 1. Same-domain relative routes (Vercel Serverless / Cloud Run / Dev Server)
 * 2. Explicit backend host via VITE_API_URL or VITE_BACKEND_URL
 */

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL)) ||
    ''
  ).trim().replace(/\/+$/, '');

  return envUrl ? `${envUrl}${cleanPath}` : cleanPath;
}

export async function safeApiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = getApiUrl(input);
  const headers = new Headers(init?.headers || {});
  
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...init,
    headers,
  });
}

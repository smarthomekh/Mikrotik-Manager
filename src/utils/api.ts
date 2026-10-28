/**
 * API utility for Home Assistant Ingress and Standalone environments.
 * Detects whether the app is running inside a Home Assistant Ingress proxy
 * (e.g. /api/hassio_ingress/<token>/) and automatically prefixes all API requests.
 */

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // 1. Injected via server HTML template
  if ((window as any).__INGRESS_PATH__) {
    const p = String((window as any).__INGRESS_PATH__).trim();
    return p.endsWith('/') ? p.slice(0, -1) : p;
  }

  // 2. Detected from browser window.location.pathname
  const path = window.location.pathname || '';
  if (path.includes('/api/hassio_ingress/')) {
    const match = path.match(/^(\/api\/hassio_ingress\/[^/]+)/);
    if (match) {
      return match[1];
    }
  }

  return '';
}

export function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return fetch(`${base}${clean}`, init);
}

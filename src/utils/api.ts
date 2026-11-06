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

export const API_ERROR_EVENT = 'mikrotik-api-error';

function reportApiError(message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: message }));
}

/**
 * fetch() wrapper. For every write (non-GET) request it also checks the JSON body and raises a UI
 * error event when the server reports `success: false` (e.g. RouterOS rejected the change), so a
 * failed save is never silently swallowed. The original Response is returned untouched.
 */
export async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const isWrite = (init?.method || 'GET').toUpperCase() !== 'GET';
  try {
    const res = await fetch(`${base}${clean}`, init);
    if (isWrite) {
      res
        .clone()
        .json()
        .then((body) => {
          if (body && body.success === false) {
            reportApiError(body.error || body.message || `Request failed (${res.status})`);
          }
        })
        .catch(() => {
          if (!res.ok) reportApiError(`Request failed (${res.status} ${res.statusText})`);
        });
    }
    return res;
  } catch (err: any) {
    if (isWrite) reportApiError(`Cannot reach the add-on server: ${err?.message || err}`);
    throw err;
  }
}

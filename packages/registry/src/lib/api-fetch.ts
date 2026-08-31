import { createStorage } from '@quark/use-storage';

export const AUTH_SESSION_KEY = 'auth:session';

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
}

export interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
  force?: boolean;
  cacheTtlMs?: number;
  useCache?: boolean;
}

interface CachedResponse {
  body: string;
  headers: Array<[string, string]>;
  status: number;
  statusText: string;
}

export async function apiRequest(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const {
    skipAuth = false,
    force = false,
    cacheTtlMs,
    useCache = true,
    headers: customHeaders,
    ...request
  } = options;
  const storage = createStorage({ namespace: 'app' });
  const cache = createStorage({ namespace: 'api-cache' });
  const headers = new Headers(customHeaders);
  const session = skipAuth
    ? null
    : await storage.getItem<AuthSession>(AUTH_SESSION_KEY);

  if (!skipAuth && !headers.has('Authorization')) {
    if (session?.accessToken) {
      headers.set('Authorization', `Bearer ${session.accessToken}`);
    }
  }

  const method = (request.method ?? 'GET').toUpperCase();
  const cacheable = useCache && method === 'GET';
  const key = cacheKey(endpoint, method, request.body, headers);
  if (cacheable) {
    try {
      const cached = await cache.getItem<CachedResponse>(key, { force });
      if (cached) return restoreResponse(cached);
    } catch {
      // Cache failures must not prevent the network request.
    }
  }

  const response = await fetch(endpoint, { ...request, headers });
  if (response.status === 401) {
    await storage.removeItem(AUTH_SESSION_KEY);
    notifySessionChange();
  }
  if (!response.ok) {
    throw new Error(
      `API request failed with status ${response.status}: ${response.statusText}`,
    );
  }
  if (cacheable) {
    await cache
      .setItem(key, await serializeResponse(response), cacheTtlMs)
      .catch(() => undefined);
  } else if (method !== 'GET') {
    await cache.clear().catch(() => undefined);
  }
  return response;
}

async function serializeResponse(response: Response): Promise<CachedResponse> {
  const body = bytesToBase64(
    new Uint8Array(await response.clone().arrayBuffer()),
  );
  const headers: Array<[string, string]> = [];
  response.headers.forEach((value, key) => headers.push([key, value]));
  return {
    body,
    headers,
    status: response.status,
    statusText: response.statusText,
  };
}

function restoreResponse(cached: CachedResponse): Response {
  const bytes = base64ToBytes(cached.body);
  const body =
    cached.status === 204 || cached.status === 205 || cached.status === 304
      ? null
      : (bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer);
  return new Response(body, {
    headers: cached.headers,
    status: cached.status,
    statusText: cached.statusText,
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined')
    return Buffer.from(bytes).toString('base64');
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined')
    return new Uint8Array(Buffer.from(value, 'base64'));
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function cacheKey(
  endpoint: string,
  method: string,
  body: BodyInit | null | undefined,
  headers: Headers,
): string {
  const identity = headers.get('Authorization') ?? 'guest';
  const input = `${method}\0${endpoint}\0${String(body ?? '')}\0${identity}`;
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `request:${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const response = await apiRequest(endpoint, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function notifySessionChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new StorageEvent('storage', { key: `app:${AUTH_SESSION_KEY}` }),
  );
}

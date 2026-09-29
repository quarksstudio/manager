import {
  APP_NAME,
  AUTH_SESSION_KEY,
  clearSession,
  loadConfig,
} from '@quarks.studio/config';

import { createStorageCache } from '../transport/storage-cache';
import {
  createHttpContext,
  type HttpContext,
  type RegistryRequestOptions,
} from '../transport/http-context';

export { AUTH_SESSION_KEY };
export { ApiError, RegistryHttpError } from '../transport/http-context';

export interface ApiFetchOptions
  extends Omit<RequestInit, 'body'>, RegistryRequestOptions {
  skipAuth?: boolean;
}

const cache = createStorageCache();

/**
 * The implicit half of the transport: base URL, bearer token and cache come from
 * the configuration and the stored session. Only this module and the `Client`
 * barrel rely on that; `createRegistryClient` does not.
 */
export async function createGlobalContext(
  options: {
    baseUrl?: string;
    headers?: HeadersInit;
    skipAuth?: boolean;
    token?: string;
  } = {},
): Promise<HttpContext> {
  const headers = new Headers(options.headers);
  const token =
    options.token ??
    (options.skipAuth ? '' : (await loadConfig()).config.token);

  if (!options.skipAuth && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const base: Record<string, string> = {};
  headers.forEach((value, key) => {
    base[key] = value;
  });

  return createHttpContext({
    baseUrl: options.baseUrl ?? '',
    headers: base,
    cache,
    onUnauthorized: async () => {
      await clearSession();
      notifySessionChange();
    },
  });
}

export async function apiRequest(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { skipAuth, ...request } = options;
  const context = await createGlobalContext({
    skipAuth,
    headers: request.headers,
  });
  return context.request(endpoint, request);
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { skipAuth, ...request } = options;
  const context = await createGlobalContext({
    skipAuth,
    headers: request.headers,
  });
  return context.fetchJson<T>(endpoint, request);
}

function notifySessionChange(): void {
  if (typeof window === 'undefined') return;
  // The stored key is namespaced by the storage engine, so the event has to
  // carry the same prefix or a key-filtered listener never matches it.
  window.dispatchEvent(
    new StorageEvent('storage', { key: `${APP_NAME}:${AUTH_SESSION_KEY}` }),
  );
}

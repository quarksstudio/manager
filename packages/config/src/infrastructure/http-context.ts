import { APP_NAME, AUTH_SESSION_KEY, clearSession, loadConfig } from '../index';

import { createStorageCache } from '@quarks.studio/storage/http-cache';
import {
  createHttpContext,
  type HttpContext,
  type RegistryRequestOptions,
} from '@quarks.studio/registry/http';

export { AUTH_SESSION_KEY };
export { ApiError, RegistryHttpError } from '@quarks.studio/registry/http';

export interface ApiFetchOptions
  extends Omit<RequestInit, 'body'>, RegistryRequestOptions {
  skipAuth?: boolean;
}

const cache = createStorageCache();

/**
 * Configured transport: the host supplies its endpoint; bearer tokens and
 * persistent cache come from the stored configuration and session.
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

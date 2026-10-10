import {
  AUTH_SESSION_KEY,
  clearSession,
  loadConfig,
  loadSession,
} from '../index';

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
 * The identity session in storage (a browser login) is the fallback bearer for
 * every non-login request when the caller passed no explicit token and none is
 * configured. Only set on a fetch, so a guest request carries no header.
 */
async function sessionToken(): Promise<string> {
  try {
    const session = await loadSession();
    return session?.accessToken && session.accessToken.trim()
      ? session.accessToken
      : '';
  } catch {
    return '';
  }
}

/**
 * Configured transport: resolve the endpoint and session before creating the
 * transport. Hosts may override the endpoint explicitly.
 */
export async function createGlobalContext(
  options: {
    baseUrl?: string;
    headers?: HeadersInit;
    skipAuth?: boolean;
    token?: string;
  } = {},
): Promise<HttpContext> {
  const { config } = await loadConfig();
  const headers = new Headers(options.headers);
  const token = options.skipAuth
    ? ''
    : (options.token ?? config.token ?? (await sessionToken()));
  if (options.skipAuth) headers.delete('Authorization');

  if (!options.skipAuth && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const base: Record<string, string> = {};
  headers.forEach((value, key) => {
    base[key] = value;
  });

  return createHttpContext({
    baseUrl: options.baseUrl ?? config.registryUrl,
    headers: base,
    cache,
    onUnauthorized: async () => {
      await clearSession();
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

import { RegistryHttpError } from '../domain/http';
export { ApiError, RegistryHttpError } from '../domain/http';
import type {
  CachedResponse,
  RegistryRequestOptions,
  HttpContext,
  HttpContextOptions,
} from '../domain/http';
export type {
  CachedResponse,
  CacheReadOptions,
  RegistryCache,
  RegistryRequestOptions,
  HttpContext,
  OperationContext,
  HttpContextOptions,
} from '../domain/http';

/**
 * The shared outbound transport.
 *
 * Every registry adapter (identity, packages, billing, catalog search) is an
 * implementation of a port declared in its own bounded context, and every one of
 * them sits on top of this module. Nothing here reads the configuration, the
 * session or React — the caller passes them in — so the same code serves a CLI, a
 * server renderer and the browser.
 */

export function createHttpContext(options: HttpContextOptions): HttpContext {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const registryUrl = new URL(`${baseUrl}/`);
  if (
    !['http:', 'https:'].includes(registryUrl.protocol) ||
    registryUrl.username ||
    registryUrl.password
  )
    throw new TypeError(
      'Registry URL must use HTTP(S) without embedded credentials',
    );
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const headers: Record<string, string> = { ...options.headers };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  async function request(
    path: string,
    requestOptions: RegistryRequestOptions = {},
  ): Promise<Response> {
    console.log("path", path);
    const method = (requestOptions.method ?? 'GET').toUpperCase();
    if (path.includes('\\'))
      throw new TypeError('Registry request URLs must not contain backslashes');
    const destination = new URL(path, registryUrl);
    if (
      destination.origin !== registryUrl.origin ||
      destination.username ||
      destination.password
    )
      throw new TypeError(
        'Registry requests must stay on the configured origin without embedded credentials',
      );
    const url = destination.href;
    const requestHeaders = new Headers(headers);
    new Headers(requestOptions.headers).forEach((value, key) =>
      requestHeaders.set(key, value),
    );
    const body = encodeBody(requestOptions.body, requestHeaders);
    // With no cache to read from, the response must not come from anywhere else.
    const cacheable =
      Boolean(options.cache) && requestOptions.useCache === true;

    if (options.cache && method === 'GET' && cacheable) {
      const cached = await options.cache
        .read(cacheKey(method, url, body, requestHeaders), {
          force: requestOptions.force,
        })
        .catch(() => null);
      if (cached) {
        return restoreResponse(cached);
      }
    }

    const response = await fetchImpl(url, {
      method,
      body,
      redirect: 'error',
      headers: requestHeaders,
      signal: requestOptions.signal ?? undefined,
      cache: requestOptions.cache ?? (cacheable ? undefined : 'no-store'),
    });

    if (response.status === 401) {
      await options.onUnauthorized?.();
    }
    if (!response.ok) {
      throw new RegistryHttpError(response.status, response.statusText);
    }

    if (!options.cache) return response;
    if (method === 'GET' && cacheable) {
      await options.cache
        .write(
          cacheKey(method, url, body, requestHeaders),
          await serializeResponse(response),
          requestOptions.cacheTtlMs,
        )
        .catch(() => undefined);
    } else if (method !== 'GET') {
      await options.cache.invalidate(pathnameOf(url)).catch(() => undefined);
    }
    return response;
  }

  return {
    baseUrl,
    token: options.token,
    headers,
    cache: options.cache,
    fetch: fetchImpl,
    request,
    async fetchJson<T>(
      path: string,
      requestOptions: RegistryRequestOptions = {},
    ) {
      const response = await request(path, requestOptions);
      if (requestOptions.raw) return response as unknown as T;
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    },
  };
}

function encodeBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === 'string') {
    if (!headers.get('Content-Type')?.trim()) {
      throw new TypeError(
        'String request bodies require an explicit Content-Type; pass an object to send JSON.',
      );
    }
    return body;
  }
  headers.set('Content-Type', 'application/json');
  return JSON.stringify(body);
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

/** Keyed by method and path so a mutation can invalidate its own reads. */
function cacheKey(
  method: string,
  url: string,
  body: BodyInit | undefined,
  headers: Headers,
): string {
  const identity = headers.get('Authorization') ?? 'guest';
  const input = `${url}\0${String(body ?? '')}\0${identity}`;
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `request:${method}:${pathnameOf(url)}:${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

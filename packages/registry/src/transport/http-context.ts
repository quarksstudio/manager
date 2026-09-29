import { logger } from '@quarks.studio/logger';

/**
 * The shared outbound transport.
 *
 * Every registry adapter (identity, packages, billing, catalog search) is an
 * implementation of a port declared in its own bounded context, and every one of
 * them sits on top of this module. Nothing here reads the configuration, the
 * session or React — the caller passes them in — so the same code serves a CLI, a
 * server renderer and the browser.
 */

export interface CachedResponse {
  body: string;
  headers: Array<[string, string]>;
  status: number;
  statusText: string;
}

export interface CacheReadOptions {
  /** Ignore any stored entry and go to the network. */
  force?: boolean;
}

export interface RegistryCache {
  read(key: string, options?: CacheReadOptions): Promise<CachedResponse | null>;
  write(key: string, entry: CachedResponse, ttlMs?: number): Promise<void>;
  /**
   * Drop cached reads under `path` after a mutation. HTTP has no dependency
   * tracking, so a path prefix is the closest safe approximation: a write to
   * `package/foo` invalidates `package/foo` and its subresources and leaves
   * unrelated packages cached.
   */
  invalidate(path: string): Promise<void>;
}

export interface RegistryRequestOptions {
  method?: string;
  /** Plain objects are serialized as JSON; `FormData` and strings pass through. */
  body?: unknown;
  headers?: HeadersInit;
  /** `RequestInit.signal`, nullable to stay assignable to it. */
  signal?: AbortSignal | null;
  /** `RequestInit.cache`, forwarded as given. */
  cache?: RequestCache;
  /** Per-request TTL, in milliseconds. */
  cacheTtlMs?: number;
  force?: boolean;
  /** Opt in: the transport does not read or write the cache by default. */
  useCache?: boolean;
  /** Return the untouched body instead of parsing JSON (bundles, proxies). */
  raw?: boolean;
}

/**
 * `packages/ui` catches `ApiError`, `apps/ui` catches `RegistryHttpError`, and
 * both must keep working, so the thrown error extends the older one instead of
 * replacing it.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    statusText = '',
  ) {
    super(`API request failed with status ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export class RegistryHttpError extends ApiError {
  constructor(status: number, statusText = '', message?: string) {
    super(status, statusText);
    this.name = 'RegistryHttpError';
    if (message) this.message = message;
  }
}

export interface HttpContext {
  baseUrl: string;
  token?: string;
  headers: Record<string, string>;
  cache?: RegistryCache;
  fetch: typeof globalThis.fetch;
  /** Raw `Response`, streams included. Throws on a non-2xx status. */
  request(path: string, options?: RegistryRequestOptions): Promise<Response>;
  /** `request` plus JSON parsing, unless `raw` was requested. */
  fetchJson<T = unknown>(
    path: string,
    options?: RegistryRequestOptions,
  ): Promise<T>;
}

/** The slice of the transport a registry adapter is allowed to touch. */
export type OperationContext = Pick<
  HttpContext,
  'baseUrl' | 'token' | 'request' | 'fetchJson'
>;

export interface HttpContextOptions {
  baseUrl: string;
  token?: string;
  headers?: Record<string, string>;
  cache?: RegistryCache;
  fetch?: typeof globalThis.fetch;
  /** Called on a 401 so the owner can drop the stored session. */
  onUnauthorized?: () => void | Promise<void>;
}

export function createHttpContext(options: HttpContextOptions): HttpContext {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const headers: Record<string, string> = { ...options.headers };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  async function request(
    path: string,
    requestOptions: RegistryRequestOptions = {},
  ): Promise<Response> {
    const method = (requestOptions.method ?? 'GET').toUpperCase();
    const url = path.startsWith('http') ? path : `${baseUrl}/${path}`;
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
        logger.silly(`cache hit for ${method} ${url}`);
        return restoreResponse(cached);
      }
    }

    logger.http(`${method} ${url}`);
    const response = await fetchImpl(url, {
      method,
      body,
      headers: requestHeaders,
      signal: requestOptions.signal ?? undefined,
      cache: requestOptions.cache ?? (cacheable ? undefined : 'no-store'),
    });

    if (response.status === 401) {
      logger.warn(`session expired while calling ${url}`);
      await options.onUnauthorized?.();
    }
    if (!response.ok) {
      logger.error(
        `${method} ${url} failed with ${response.status} ${response.statusText}`,
      );
      throw new RegistryHttpError(response.status, response.statusText);
    }
    logger.http(`${method} ${url} ${response.status}`);

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
  if (typeof body === 'string' || body instanceof FormData) return body;
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

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
  /**
   * Pass objects for JSON: the transport serializes them and sets application/json.
   * Strings pass through but require an explicit Content-Type.
   * FormData passes through; let fetch supply its multipart boundary.
   */
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

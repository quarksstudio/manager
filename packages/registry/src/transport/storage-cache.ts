import { createStorage } from '@quarks.studio/use-storage/storage';

import type {
  CachedResponse,
  CacheReadOptions,
  RegistryCache,
} from './http-context';

/**
 * Two hours. Long enough for a CLI to reuse a manifest across a resolve, short
 * enough that nobody installs yesterday's registry state.
 */
export const DEFAULT_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

export const API_CACHE_NAMESPACE = 'api-cache';

export interface StorageCacheOptions {
  namespace?: string;
  ttlMs?: number;
}

/**
 * Persistent response cache for the clients that ask for one. The request-scoped
 * client does not use it: a server render must never answer from a file written
 * hours ago.
 */
export function createStorageCache(
  options: StorageCacheOptions = {},
): RegistryCache {
  const storage = createStorage({
    namespace: options.namespace ?? API_CACHE_NAMESPACE,
  });

  return {
    async read(key, readOptions: CacheReadOptions = {}) {
      const entry = await storage.getItem<CachedResponse>(key, {
        force: readOptions.force,
      });
      return entry ?? null;
    },
    write(key, entry, ttlMs) {
      return storage.setItem(
        key,
        entry,
        ttlMs ?? options.ttlMs ?? DEFAULT_CACHE_TTL_MS,
      );
    },
    invalidate(path) {
      // Reads of the mutated resource, whatever the method that mutated it.
      return storage.clear(`request:GET:${path}`);
    },
  };
}

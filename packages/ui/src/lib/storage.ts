import { createStorage } from '@quark/use-storage';

export const CACHE_TTL_MS = 60 * 60 * 1000;

export const apiCache = createStorage({
  namespace: 'quark:web',
  ttl: CACHE_TTL_MS,
});

export function packageCacheKey(name: string): string {
  return `pkg:${name}`;
}

export function readmeCacheKey(name: string, version: string): string {
  return `readme:${name}@${version}`;
}

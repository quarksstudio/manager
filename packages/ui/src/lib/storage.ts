import { createStorage } from '@quarks.studio/use-storage';

export const CACHE_TTL_MS = 60 * 60 * 1000;

export const apiCache = createStorage({
  namespace: 'quark:web',
  ttl: CACHE_TTL_MS,
});

export function cacheKey(key: string, name: string): string {
  return `${key}:${name}`;
}

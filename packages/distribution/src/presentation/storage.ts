import { createStorage } from '@quarks.studio/storage';

export const CACHE_TTL_MS = 60 * 60 * 1000;

export const apiCache = createStorage({
  namespace: 'quark:web:package-v2',
  ttl: CACHE_TTL_MS,
});

export function cacheKey(key: string, name: string): string {
  return `${key}:${name}`;
}

export interface QueryState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  refetch: () => void;
}
export interface QueryCache {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface CachedQuery<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  refetch: () => void;
}
export interface CachedQueryOptions<T> {
  cache: QueryCache;
  key: string;
  load: () => Promise<T>;
  enabled: boolean;
  ttlMs?: number;
}

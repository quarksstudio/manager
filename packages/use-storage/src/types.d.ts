export declare const DEFAULT_STORAGE_TTL = 604800000;
export type StorageBackend = 'auto' | 'browser' | 'node';
export interface WebStorage {
  readonly length: number;
  clear(): void;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}
export interface StorageOptions {
  namespace?: string;
  basePath?: string;
  ttl?: number;
  backend?: StorageBackend;
  browserStorage?: WebStorage;
}
export interface StorageItem<T = unknown> {
  value: T;
  createdAt: number;
  expiresAt: number | null;
  version?: string;
}
export interface StorageMetadata {
  isExpired: boolean;
  lastUpdated: number | null;
}
export interface IStorageEngine {
  getItem<T>(
    key: string,
    options?: {
      force?: boolean;
    },
  ): Promise<T | null>;
  setItem<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  hasItem(key: string): Promise<boolean>;
  isExpired(key: string): Promise<boolean>;
}
export interface RawStorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(prefix: string): Promise<void>;
}

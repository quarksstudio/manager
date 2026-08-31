import type { StorageMetadata, StorageOptions } from './types';
export type StorageSetter<T> = (value: T | ((current: T) => T), ttlMs?: number) => Promise<void>;
export declare function useStorage<T>(key: string, initialValue: T, options?: StorageOptions): [T, StorageSetter<T>, () => Promise<void>, StorageMetadata];

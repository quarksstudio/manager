import { type IStorageEngine, type StorageItem, type StorageOptions } from './types';
export interface InspectableStorageEngine extends IStorageEngine {
    getStorageItem<T>(key: string): Promise<StorageItem<T> | null>;
}
export declare function createStorage(options?: StorageOptions): IStorageEngine;

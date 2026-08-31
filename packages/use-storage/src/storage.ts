import { BrowserStorageAdapter } from './browser-adapter';
import {
  DEFAULT_STORAGE_TTL,
  type IStorageEngine,
  type RawStorageAdapter,
  type StorageItem,
  type StorageOptions,
} from './types';

class LazyNodeStorageAdapter implements RawStorageAdapter {
  private adapter?: Promise<RawStorageAdapter>;

  constructor(
    private readonly namespace: string,
    private readonly basePath?: string,
  ) {}

  get(key: string): Promise<string | null> {
    return this.load().then((adapter) => adapter.get(key));
  }

  set(key: string, value: string): Promise<void> {
    return this.load().then((adapter) => adapter.set(key, value));
  }

  remove(key: string): Promise<void> {
    return this.load().then((adapter) => adapter.remove(key));
  }

  clear(prefix: string): Promise<void> {
    return this.load().then((adapter) => adapter.clear(prefix));
  }

  private load(): Promise<RawStorageAdapter> {
    this.adapter ??= import('./node-adapter').then(
      ({ NodeStorageAdapter }) =>
        new NodeStorageAdapter(this.namespace, this.basePath),
    );
    return this.adapter;
  }
}

export interface InspectableStorageEngine extends IStorageEngine {
  getStorageItem<T>(key: string): Promise<StorageItem<T> | null>;
}

class StorageEngine implements InspectableStorageEngine {
  private readonly prefix: string;

  constructor(
    namespace: string,
    private readonly ttl: number,
    private readonly adapter: RawStorageAdapter,
  ) {
    this.prefix = `${namespace}:`;
  }

  async getItem<T>(
    key: string,
    options: { force?: boolean } = {},
  ): Promise<T | null> {
    if (options.force) return null;
    return (await this.getStorageItem<T>(key))?.value ?? null;
  }

  async getStorageItem<T>(key: string): Promise<StorageItem<T> | null> {
    const storageKey = this.storageKey(key);
    const raw = await this.adapter.get(storageKey);
    if (raw === null) return null;

    let item: StorageItem<T>;
    try {
      item = JSON.parse(raw) as StorageItem<T>;
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof item.createdAt !== 'number' ||
        !('value' in item) ||
        (item.expiresAt !== null && typeof item.expiresAt !== 'number')
      ) {
        throw new Error('Invalid storage item');
      }
    } catch {
      await this.adapter.remove(storageKey);
      return null;
    }

    if (this.expired(item)) {
      await this.adapter.remove(storageKey);
      return null;
    }
    return item;
  }

  async setItem<T>(key: string, value: T, ttlMs = this.ttl): Promise<void> {
    this.validateTtl(ttlMs);
    const createdAt = Date.now();
    const item: StorageItem<T> = {
      value,
      createdAt,
      expiresAt: ttlMs === Infinity ? null : createdAt + ttlMs,
    };
    await this.adapter.set(this.storageKey(key), JSON.stringify(item));
  }

  removeItem(key: string): Promise<void> {
    return this.adapter.remove(this.storageKey(key));
  }

  clear(): Promise<void> {
    return this.adapter.clear(this.prefix);
  }

  async hasItem(key: string): Promise<boolean> {
    return (await this.getStorageItem(key)) !== null;
  }

  async isExpired(key: string): Promise<boolean> {
    const storageKey = this.storageKey(key);
    const raw = await this.adapter.get(storageKey);
    if (raw === null) return false;
    try {
      const item = JSON.parse(raw) as StorageItem;
      if (!this.expired(item)) return false;
    } catch {
      await this.adapter.remove(storageKey);
      return true;
    }
    await this.adapter.remove(storageKey);
    return true;
  }

  private storageKey(key: string): string {
    if (!key || key.includes('\0')) throw new Error('Invalid storage key');
    return `${this.prefix}${key}`;
  }

  private expired(item: StorageItem): boolean {
    return item.expiresAt !== null && Date.now() > item.expiresAt;
  }

  private validateTtl(ttl: number): void {
    if ((ttl !== Infinity && !Number.isFinite(ttl)) || ttl < 0) {
      throw new Error('TTL must be a non-negative number or Infinity');
    }
  }
}

export function createStorage(options: StorageOptions = {}): IStorageEngine {
  const namespace = options.namespace?.trim() || 'app';
  const ttl = options.ttl ?? DEFAULT_STORAGE_TTL;
  const browserAvailable = typeof window !== 'undefined';
  const backend =
    options.backend === undefined || options.backend === 'auto'
      ? browserAvailable
        ? 'browser'
        : 'node'
      : options.backend;

  const adapter =
    backend === 'browser'
      ? new BrowserStorageAdapter(resolveBrowserStorage(options))
      : new LazyNodeStorageAdapter(namespace, options.basePath);

  return new StorageEngine(namespace, ttl, adapter);
}

function resolveBrowserStorage(options: StorageOptions) {
  if (options.browserStorage) return options.browserStorage;
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

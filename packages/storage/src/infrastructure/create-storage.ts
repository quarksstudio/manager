import { BrowserStorageAdapter } from './browser-adapter';
import {
  DEFAULT_STORAGE_TTL,
  type IStorageEngine,
  type RawStorageAdapter,
  type StorageOptions,
} from '../domain/storage';
import { StorageEngine } from '../application/storage-engine';
class LazyNodeStorageAdapter implements RawStorageAdapter {
  private adapter?: Promise<RawStorageAdapter>;

  constructor(
    private readonly namespace: string,
    private readonly basePath?: string,
    private readonly isConfig?: boolean,
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
        new NodeStorageAdapter(this.namespace, this.basePath, !!this.isConfig),
    );
    return this.adapter;
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
      : new LazyNodeStorageAdapter(
          namespace,
          options.basePath,
          !!options.isConfig,
        );

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

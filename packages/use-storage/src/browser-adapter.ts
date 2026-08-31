import type { RawStorageAdapter, WebStorage } from './types';

const memoryFallback = new Map<string, string>();

export class BrowserStorageAdapter implements RawStorageAdapter {
  constructor(private readonly storage?: WebStorage) {}

  async get(key: string): Promise<string | null> {
    try {
      return this.storage?.getItem(key) ?? memoryFallback.get(key) ?? null;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      if (!this.storage) throw new Error('Browser storage is unavailable');
      this.storage.setItem(key, value);
      memoryFallback.delete(key);
    } catch {
      memoryFallback.set(key, value);
    }
  }

  async remove(key: string): Promise<void> {
    memoryFallback.delete(key);
    try {
      this.storage?.removeItem(key);
    } catch {
      // The in-memory copy is still removed when persistent storage fails.
    }
  }

  async clear(prefix: string): Promise<void> {
    for (const key of memoryFallback.keys()) {
      if (key.startsWith(prefix)) memoryFallback.delete(key);
    }
    if (!this.storage) return;

    try {
      const keys = Array.from({ length: this.storage.length }, (_, index) =>
        this.storage?.key(index),
      ).filter((key): key is string => !!key && key.startsWith(prefix));
      for (const key of keys) this.storage.removeItem(key);
    } catch {
      // A denied localStorage remains usable through the memory fallback.
    }
  }
}

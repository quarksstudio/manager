import type { RawStorageAdapter, WebStorage } from './types';
export declare class BrowserStorageAdapter implements RawStorageAdapter {
  private readonly storage?;
  constructor(storage?: WebStorage | undefined);
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(prefix: string): Promise<void>;
}

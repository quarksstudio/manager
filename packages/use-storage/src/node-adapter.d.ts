import type { RawStorageAdapter } from './types';
export declare class NodeStorageAdapter implements RawStorageAdapter {
  readonly basePath: string;
  constructor(namespace: string, basePath?: string);
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(prefix: string): Promise<void>;
  private filePath;
  private decodeFileName;
  private safePath;
}

import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import * as os from 'os';
import * as path from 'path';

import type { RawStorageAdapter } from './types';

export class NodeStorageAdapter implements RawStorageAdapter {
  readonly basePath: string;

  constructor(namespace: string, basePath?: string) {
    this.basePath = path.resolve(
      basePath ?? path.join(os.homedir(), '.cache', namespace, 'storage'),
    );
  }

  async get(key: string): Promise<string | null> {
    try {
      return await fs.readFile(this.filePath(key), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true, mode: 0o700 });
    const destination = this.filePath(key);
    const temporary = `${destination}.${process.pid}-${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, value, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
      await fs.rename(temporary, destination);
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    await fs.rm(this.filePath(key), { force: true });
  }

  async clear(prefix: string): Promise<void> {
    let files: string[];
    try {
      files = await fs.readdir(this.basePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }

    await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .filter((file) => this.decodeFileName(file).startsWith(prefix))
        .map((file) => fs.rm(this.safePath(file), { force: true })),
    );
  }

  private filePath(key: string): string {
    return this.safePath(`${Buffer.from(key).toString('base64url')}.json`);
  }

  private decodeFileName(file: string): string {
    try {
      return Buffer.from(file.slice(0, -'.json'.length), 'base64url').toString(
        'utf8',
      );
    } catch {
      return '';
    }
  }

  private safePath(file: string): string {
    const target = path.resolve(this.basePath, file);
    if (!target.startsWith(`${this.basePath}${path.sep}`)) {
      throw new Error('Storage path escapes the configured base path');
    }
    return target;
  }
}

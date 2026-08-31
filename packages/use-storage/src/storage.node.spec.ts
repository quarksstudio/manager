import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { createStorage } from './storage';
import { DEFAULT_STORAGE_TTL } from './types';

describe('Node storage', () => {
  let basePath: string;

  beforeEach(async () => {
    basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'use-storage-test-'));
  });

  afterEach(async () => {
    jest.useRealTimers();
    await fs.rm(basePath, { recursive: true, force: true });
  });

  it('persists JSON values across storage instances', async () => {
    const first = createStorage({ basePath });
    await first.setItem('metadata', { version: '1.0.0' });

    const second = createStorage({ backend: 'node', basePath });
    await expect(second.getItem('metadata')).resolves.toEqual({
      version: '1.0.0',
    });

    const files = await fs.readdir(basePath);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.json$/);
    expect(files.some((file) => file.endsWith('.tmp'))).toBe(false);
  });

  it('applies the default seven-day TTL and removes expired data', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const storage = createStorage({ backend: 'node', basePath });
    await storage.setItem('api', 'cached');

    jest.advanceTimersByTime(DEFAULT_STORAGE_TTL);
    await expect(storage.getItem('api')).resolves.toBe('cached');

    jest.advanceTimersByTime(1);
    await expect(storage.isExpired('api')).resolves.toBe(true);
    await expect(storage.getItem('api')).resolves.toBeNull();
    await expect(fs.readdir(basePath)).resolves.toEqual([]);
  });

  it('supports custom TTL, permanent entries and forced cache misses', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const storage = createStorage({ backend: 'node', basePath });
    await storage.setItem('short', 1, 10);
    await storage.setItem('permanent', 2, Infinity);

    await expect(storage.getItem('short', { force: true })).resolves.toBeNull();
    await expect(storage.getItem('short')).resolves.toBe(1);
    jest.advanceTimersByTime(11);
    await expect(storage.getItem('short')).resolves.toBeNull();
    await expect(storage.getItem('permanent')).resolves.toBe(2);
  });

  it('isolates namespaces and clears only the active namespace', async () => {
    const alpha = createStorage({ backend: 'node', basePath, namespace: 'a' });
    const beta = createStorage({ backend: 'node', basePath, namespace: 'b' });
    await alpha.setItem('same', 'alpha');
    await beta.setItem('same', 'beta');

    await alpha.clear();

    await expect(alpha.hasItem('same')).resolves.toBe(false);
    await expect(beta.getItem('same')).resolves.toBe('beta');
  });

  it('encodes hostile keys without allowing path traversal', async () => {
    const storage = createStorage({ backend: 'node', basePath });
    await storage.setItem('../../outside', 'safe');

    await expect(storage.getItem('../../outside')).resolves.toBe('safe');
    const files = await fs.readdir(basePath);
    expect(files).toHaveLength(1);
    expect(path.dirname(path.join(basePath, files[0]))).toBe(basePath);
  });
});

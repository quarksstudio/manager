import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  cacheSkill,
  cleanSkillCache,
  listSkillCache,
  readCachedSkill,
  verifySkillCache,
} from './skill-cache';

describe('skill cache', () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-cache-'));
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('stores and reuses a content-addressed bundle', async () => {
    const bundle = Buffer.from('verified archive');
    const hash = createHash('sha256').update(bundle).digest('hex');
    await cacheSkill(
      bundle,
      {
        name: 'demo',
        version: '1.0.0',
        registry: 'https://registry.test',
        hash,
      },
      root,
    );
    await expect(readCachedSkill(hash, root)).resolves.toEqual(bundle);
    await expect(listSkillCache(root)).resolves.toHaveLength(1);
  });

  it('evicts a corrupted artifact', async () => {
    const bundle = Buffer.from('original');
    const hash = createHash('sha256').update(bundle).digest('hex');
    await cacheSkill(
      bundle,
      {
        name: 'demo',
        version: '1.0.0',
        registry: 'https://registry.test',
        hash,
      },
      root,
    );
    await fs.writeFile(path.join(root, 'sha256', `${hash}.tgz`), 'tampered');
    await expect(readCachedSkill(hash, root)).resolves.toBeUndefined();
    await expect(listSkillCache(root)).resolves.toEqual([]);
  });

  it('supports concurrent writes and manual verification and cleanup', async () => {
    const bundle = Buffer.from('same bundle');
    const hash = createHash('sha256').update(bundle).digest('hex');
    const metadata = {
      name: 'demo',
      version: '1.0.0',
      registry: 'https://registry.test',
      hash,
    };
    await Promise.all([
      cacheSkill(bundle, metadata, root),
      cacheSkill(bundle, metadata, root),
    ]);
    const result = await verifySkillCache(root);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
    await cleanSkillCache(root);
    await expect(listSkillCache(root)).resolves.toEqual([]);
  });
});

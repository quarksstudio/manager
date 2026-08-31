import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface CachedSkillArtifact {
  name: string;
  version: string;
  registry: string;
  hash: string;
  sizeBytes: number;
  cachedAt: string;
  lastUsedAt: string;
}

interface CacheIndex {
  schemaVersion: 1;
  artifacts: Record<string, CachedSkillArtifact>;
}

export interface CacheVerificationResult {
  valid: CachedSkillArtifact[];
  invalid: CachedSkillArtifact[];
}

export function getSkillCachePath(cacheDir = defaultCacheDir()): string {
  return path.resolve(cacheDir);
}

export async function readCachedSkill(
  hash: string,
  cacheDir = defaultCacheDir(),
): Promise<Buffer | undefined> {
  assertHash(hash);
  const file = artifactPath(cacheDir, hash);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  if (digest(buffer) !== hash.toLowerCase()) {
    await fs.rm(file, { force: true });
    await removeIndexEntry(cacheDir, hash);
    return undefined;
  }
  await touchIndexEntry(cacheDir, hash);
  return buffer;
}

export async function cacheSkill(
  bundle: Buffer,
  metadata: Pick<CachedSkillArtifact, 'name' | 'version' | 'registry' | 'hash'>,
  cacheDir = defaultCacheDir(),
): Promise<CachedSkillArtifact> {
  assertHash(metadata.hash);
  const hash = metadata.hash.toLowerCase();
  if (digest(bundle) !== hash)
    throw new Error('Cannot cache skill: SHA-256 mismatch');
  const root = getSkillCachePath(cacheDir);
  const artifacts = path.join(root, 'sha256');
  await fs.mkdir(artifacts, { recursive: true });
  const destination = artifactPath(root, hash);
  const temporary = `${destination}.${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;
  try {
    await fs.writeFile(temporary, bundle, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, destination);
  } finally {
    await fs.rm(temporary, { force: true });
  }
  const now = new Date().toISOString();
  const previous = (await readIndex(root)).artifacts[hash];
  const entry: CachedSkillArtifact = {
    ...metadata,
    hash,
    sizeBytes: bundle.byteLength,
    cachedAt: previous?.cachedAt ?? now,
    lastUsedAt: now,
  };
  await updateIndex(root, (index) => {
    index.artifacts[hash] = entry;
  });
  return entry;
}

export async function listSkillCache(
  cacheDir = defaultCacheDir(),
): Promise<CachedSkillArtifact[]> {
  return Object.values((await readIndex(cacheDir)).artifacts).sort((a, b) =>
    `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`),
  );
}

export async function verifySkillCache(
  cacheDir = defaultCacheDir(),
): Promise<CacheVerificationResult> {
  const entries = await listSkillCache(cacheDir);
  const valid: CachedSkillArtifact[] = [];
  const invalid: CachedSkillArtifact[] = [];
  for (const entry of entries) {
    try {
      const buffer = await fs.readFile(artifactPath(cacheDir, entry.hash));
      (digest(buffer) === entry.hash ? valid : invalid).push(entry);
    } catch {
      invalid.push(entry);
    }
  }
  return { valid, invalid };
}

export async function cleanSkillCache(
  cacheDir = defaultCacheDir(),
): Promise<void> {
  await fs.rm(getSkillCachePath(cacheDir), { recursive: true, force: true });
}

function defaultCacheDir(): string {
  return path.join(os.homedir(), '.quark', 'cache', 'skills');
}

function artifactPath(cacheDir: string, hash: string): string {
  assertHash(hash);
  return path.join(
    getSkillCachePath(cacheDir),
    'sha256',
    `${hash.toLowerCase()}.tgz`,
  );
}

function indexPath(cacheDir: string): string {
  return path.join(getSkillCachePath(cacheDir), 'index.json');
}

async function readIndex(cacheDir: string): Promise<CacheIndex> {
  try {
    const parsed = JSON.parse(
      await fs.readFile(indexPath(cacheDir), 'utf8'),
    ) as CacheIndex;
    if (parsed.schemaVersion !== 1 || !parsed.artifacts)
      throw new Error('Invalid skill cache index');
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { schemaVersion: 1, artifacts: {} };
    throw error;
  }
}

async function updateIndex(
  cacheDir: string,
  change: (index: CacheIndex) => void,
): Promise<void> {
  const root = getSkillCachePath(cacheDir);
  await fs.mkdir(root, { recursive: true });
  const index = await readIndex(root);
  change(index);
  const temporary = path.join(
    root,
    `index.${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`,
  );
  await fs.writeFile(temporary, `${JSON.stringify(index, null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  await fs.rename(temporary, indexPath(root));
}

async function touchIndexEntry(cacheDir: string, hash: string): Promise<void> {
  const index = await readIndex(cacheDir);
  if (!index.artifacts[hash]) return;
  await updateIndex(cacheDir, (current) => {
    if (current.artifacts[hash])
      current.artifacts[hash].lastUsedAt = new Date().toISOString();
  });
}

async function removeIndexEntry(cacheDir: string, hash: string): Promise<void> {
  const index = await readIndex(cacheDir);
  if (!index.artifacts[hash]) return;
  await updateIndex(cacheDir, (current) => {
    delete current.artifacts[hash];
  });
}

function assertHash(hash: string): void {
  if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error('Invalid SHA-256 hash');
}

function digest(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

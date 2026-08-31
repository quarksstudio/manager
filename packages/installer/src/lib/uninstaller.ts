import { promises as fs } from 'fs';
import * as path from 'path';

import { parseYaml, stringifyYaml, type SkillsManifest } from '@quark/targz';

import type { SkillLockfile } from './recursive-installer';

export type UninstallStep =
  | 'idle'
  | 'locating'
  | 'reading-manifest'
  | 'removing-files'
  | 'cleaning'
  | 'completed';

export class PackageNotFound extends Error {
  override readonly name = 'PackageNotFound';

  constructor(packageName: string) {
    super(`Installed package not found: ${packageName}`);
  }
}

export async function uninstall(
  packageName: string,
  targetInstallDir: string,
  onStep?: (step: UninstallStep, progressPercentage: number) => void,
): Promise<void> {
  if (!path.isAbsolute(targetInstallDir)) {
    throw new Error('targetInstallDir must be an absolute path');
  }
  const target = path.resolve(targetInstallDir);
  onStep?.('locating', 10);
  const lockPath = path.join(target, 'skill.lock.yml');
  const lock = await readLock(lockPath, packageName);
  const locator = locatePackage(lock, packageName);
  if (!locator) throw new PackageNotFound(packageName);

  const metadataRoot = safeResolve(
    target,
    path.join('.skills_metadata', safeLocator(locator)),
  );
  const manifestPath = path.join(metadataRoot, 'skills.yml');
  onStep?.('reading-manifest', 25);
  let manifest: SkillsManifest;
  try {
    manifest = parseYaml<SkillsManifest>(
      await fs.readFile(manifestPath, 'utf8'),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new PackageNotFound(packageName);
    }
    throw error;
  }
  const entry = lock.packages[locator];
  if (!entry || manifest.name !== splitSelector(packageName).name) {
    throw new PackageNotFound(packageName);
  }

  const installRoot = locator.includes('>')
    ? safeResolve(target, path.join('.skills_nested', safeLocator(locator)))
    : target;
  const manifestTargets = collectTargets(manifest).sort();
  const lockedTargets = [...entry.mappedFiles].sort();
  if (JSON.stringify(manifestTargets) !== JSON.stringify(lockedTargets)) {
    throw new Error(`Installed manifest differs from lockfile: ${packageName}`);
  }
  const mappedFiles = manifestTargets.map((relative) =>
    safeResolve(installRoot, relative),
  );
  const transaction = await fs.mkdtemp(path.join(target, '.quark-uninstall-'));
  const moved: Array<{ source: string; backup: string }> = [];
  const previousLock = await fs.readFile(lockPath, 'utf8');
  try {
    onStep?.('removing-files', 45);
    for (const source of [...mappedFiles, manifestPath]) {
      const relative = path.relative(target, source);
      const backup = safeResolve(transaction, relative);
      try {
        await fs.mkdir(path.dirname(backup), { recursive: true });
        await fs.rename(source, backup);
        moved.push({ source, backup });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }

    delete lock.packages[locator];
    for (const [name, dependencyLocator] of Object.entries(lock.dependencies)) {
      if (dependencyLocator === locator) delete lock.dependencies[name];
    }
    onStep?.('cleaning', 80);
    await writeLock(lockPath, lock);
    await removeEmptyParents(
      [...mappedFiles, manifestPath].map(path.dirname),
      target,
    );
    onStep?.('completed', 100);
  } catch (error) {
    await fs.writeFile(lockPath, previousLock);
    for (const { source, backup } of moved.reverse()) {
      await fs.mkdir(path.dirname(source), { recursive: true });
      await fs.rename(backup, source).catch(() => undefined);
    }
    throw error;
  } finally {
    await fs.rm(transaction, { recursive: true, force: true });
  }
}

async function readLock(
  lockPath: string,
  packageName: string,
): Promise<SkillLockfile> {
  try {
    const lock = parseYaml<SkillLockfile>(await fs.readFile(lockPath, 'utf8'));
    if (lock.lockfileVersion !== 1 || !lock.dependencies || !lock.packages) {
      throw new Error(`Invalid skill lockfile: ${lockPath}`);
    }
    return lock;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new PackageNotFound(packageName);
    }
    throw error;
  }
}

function locatePackage(
  lock: SkillLockfile,
  selector: string,
): string | undefined {
  const { name, version } = splitSelector(selector);
  const root = lock.dependencies[name];
  if (root && (!version || lock.packages[root]?.version === version))
    return root;
  const matches = Object.keys(lock.packages)
    .filter((locator) => {
      const tail = locator.split('>').at(-1);
      return (
        tail?.startsWith(`${name}@`) &&
        (!version || lock.packages[locator].version === version)
      );
    })
    .sort();
  return matches.length === 1 ? matches[0] : undefined;
}

function splitSelector(selector: string): { name: string; version?: string } {
  const index = selector.startsWith('@')
    ? selector.indexOf('@', selector.indexOf('/') + 1)
    : selector.lastIndexOf('@');
  return index > 0
    ? { name: selector.slice(0, index), version: selector.slice(index + 1) }
    : { name: selector };
}

function collectTargets(manifest: SkillsManifest): string[] {
  const targets = new Set<string>();
  for (const mapping of Object.values(manifest.files ?? {})) {
    for (const target of Object.keys(mapping.agents ?? {})) targets.add(target);
  }
  return [...targets];
}

function safeResolve(root: string, relative: string): string {
  const resolved = path.resolve(root, relative);
  const difference = path.relative(path.resolve(root), resolved);
  if (
    !difference ||
    difference.startsWith('..') ||
    path.isAbsolute(difference)
  ) {
    throw new Error(`Unsafe uninstall path: ${relative}`);
  }
  return resolved;
}

async function writeLock(lockPath: string, lock: SkillLockfile): Promise<void> {
  const temporary = `${lockPath}.${process.pid}-${Date.now()}.tmp`;
  await fs.writeFile(temporary, stringifyYaml(lock), { flag: 'wx' });
  await fs.rename(temporary, lockPath);
}

async function removeEmptyParents(
  directories: string[],
  root: string,
): Promise<void> {
  const boundary = path.resolve(root);
  const candidates = new Set<string>();
  for (const directory of directories) {
    let current = path.resolve(directory);
    while (
      current !== boundary &&
      current.startsWith(`${boundary}${path.sep}`)
    ) {
      candidates.add(current);
      current = path.dirname(current);
    }
  }
  for (const directory of [...candidates].sort((a, b) => b.length - a.length)) {
    await fs.rmdir(directory).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY') throw error;
    });
  }
}

function safeLocator(locator: string): string {
  return locator.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

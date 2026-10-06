import { promises as fs } from 'fs';
import * as path from 'path';

import {
  parseYaml,
  stringifyYaml,
  type SkillsManifest,
} from '@quarks.studio/targz';

import {
  InstallDirectory,
  assertRegularFileOrAbsent,
} from './install-directory';

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
  const project = await InstallDirectory.open(target).catch((error) => {
    if (error.code === 'ENOENT') throw new PackageNotFound(packageName);
    throw error;
  });
  try {
    const read = async (relative: string) =>
      project.readFile(relative).catch((error) => {
        if (error.code === 'ENOENT') throw new PackageNotFound(packageName);
        throw error;
      });
    const previousLock = await read('skill.lock.yml');
    const lock = parseYaml<SkillLockfile>(previousLock);
    if (lock.lockfileVersion !== 1 || !lock.dependencies || !lock.packages)
      throw new Error('Invalid skill lockfile');
    const locator = locatePackage(lock, packageName);
    if (!locator) throw new PackageNotFound(packageName);
    const manifestPath = path.join(
      '.skills_metadata',
      safeLocator(locator),
      'skills.yml',
    );
    onStep?.('reading-manifest', 25);
    const manifest = parseYaml<SkillsManifest>(await read(manifestPath));
    const entry = lock.packages[locator];
    if (!entry || manifest.name !== splitSelector(packageName).name)
      throw new PackageNotFound(packageName);
    const installRoot = locator.includes('>')
      ? safeResolve(target, path.join('.skills_nested', safeLocator(locator)))
      : target;
    const manifestTargets = collectTargets(manifest).sort();
    if (
      JSON.stringify(manifestTargets) !==
      JSON.stringify([...entry.mappedFiles].sort())
    )
      throw new Error(
        `Installed manifest differs from lockfile: ${packageName}`,
      );
    const files = [
      ...manifestTargets.map((relative) =>
        path.relative(target, safeResolve(installRoot, relative)),
      ),
      manifestPath,
    ];
    for (const relative of [...files, 'skill.lock.yml'])
      await project.assertFile(relative);
    const transaction = await project.temporary();
    const moved: string[] = [];
    let retainBackup = false;
    const writeLock = async (content: string, temporary: string) => {
      await transaction.directory.withEntry(temporary, true, async (staged) => {
        await fs.writeFile(staged, content, { flag: 'wx' });
        await project.withEntry(
          'skill.lock.yml',
          false,
          async (destination) => {
            await fs.rename(staged, destination);
          },
        );
      });
    };
    try {
      onStep?.('removing-files', 45);
      for (const relative of files) {
        await project.withEntry(
          relative,
          false,
          async (source) => {
            await assertRegularFileOrAbsent(source);
            await transaction.directory.withEntry(
              path.join('backup', relative),
              true,
              async (backup) => {
                try {
                  await fs.rename(source, backup);
                  moved.push(relative);
                } catch (error) {
                  if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
                    throw error;
                }
              },
            );
          },
          true,
        );
        await project.assertFile(relative);
      }
      delete lock.packages[locator];
      for (const [name, dependencyLocator] of Object.entries(lock.dependencies))
        if (dependencyLocator === locator) delete lock.dependencies[name];
      onStep?.('cleaning', 80);
      await writeLock(stringifyYaml(lock), 'new-lock');
      await removeEmptyParents(files.map(path.dirname), project);
      onStep?.('completed', 100);
    } catch (error) {
      const failures: unknown[] = [];
      try {
        await writeLock(previousLock, 'restore-lock');
      } catch (failure) {
        failures.push(failure);
      }
      for (const relative of moved.reverse()) {
        try {
          await project.withEntry(relative, true, async (source) => {
            await assertRegularFileOrAbsent(source);
            await transaction.directory.withEntry(
              path.join('backup', relative),
              false,
              (backup) => fs.rename(backup, source),
            );
          });
        } catch (failure) {
          failures.push(failure);
        }
      }
      if (failures.length) {
        retainBackup = true;
        throw Object.assign(
          new Error(
            `Uninstall rollback incomplete; backups retained in ${path.join(target, transaction.name)}`,
          ),
          { errors: [error, ...failures] },
        );
      }
      throw error;
    } finally {
      await transaction.directory.close();
      if (!retainBackup)
        await project.withEntry(transaction.name, false, (entry) =>
          fs.rm(entry, { recursive: true, force: true }),
        );
    }
  } finally {
    await project.close();
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

async function removeEmptyParents(
  directories: string[],
  project: InstallDirectory,
): Promise<void> {
  const candidates = new Set<string>();
  for (const directory of directories) {
    let current = directory;
    while (current !== '.') {
      candidates.add(current);
      current = path.dirname(current);
    }
  }
  for (const directory of [...candidates].sort((a, b) => b.length - a.length)) {
    await project.withEntry(
      directory,
      false,
      async (entry) => {
        await fs.rmdir(entry).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY')
            throw error;
        });
      },
      true,
    );
  }
}

function safeLocator(locator: string): string {
  return locator.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

import {
  InstallDirectory,
  assertRegularFileOrAbsent,
} from './install-directory';
import {
  compare,
  satisfies as semverSatisfies,
  valid,
  validRange,
} from 'semver';
import { createHash } from 'crypto';
import { loadConfig } from '@quarks.studio/config';
import { promises as fs, constants as fsConstants } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { apiFetch, apiRequest } from '@quarks.studio/config/http';
import {
  cacheSkill,
  readCachedSkill,
} from '@quarks.studio/storage/installations';
import {
  parseYaml,
  stringifyYaml,
  unpack,
  readArchiveResponse,
  ARCHIVE_LIMITS,
  type SkillsManifest,
} from '@quarks.studio/targz';

export interface RecursiveInstallOptions {
  force?: boolean;
  targetInstallDir?: string;
  providers?: string[];
  cacheDir?: string;
  onCacheWarning?: (error: Error) => void;
}

export interface LockedPackage {
  version: string;
  resolved: string;
  integrity: string;
  isCertified: boolean;
  mappedFiles: string[];
  dependencies?: Record<string, string>;
}

export interface SkillLockfile {
  lockfileVersion: 1;
  dependencies: Record<string, string>;
  packages: Record<string, LockedPackage>;
}

export interface InstallResult {
  targetInstallDir: string;
  lockfilePath: string;
  installed: string[];
  reused: string[];
  rootLocators: string[];
  isolatedLocators: string[];
}

interface RegistryVersion {
  version: string;
  hash: string;
  isCertified?: boolean;
}

interface RegistryPackage {
  versions?: Array<RegistryVersion | string>;
}

interface ResolvedNode {
  locator: string;
  name: string;
  version: string;
  metadata: RegistryVersion;
  manifest: SkillsManifest;
  extracted: string;
  root: boolean;
}

const LOCKFILE = 'skill.lock.yml';
const LEGACY_LOCKFILES = ['skills.lock.yml', 'skills-lock.yml'];

export async function install(
  packageSelector?: string | string[],
  options: RecursiveInstallOptions = {},
): Promise<InstallResult> {
  InstallDirectory.assertSupported();
  const target = path.resolve(options.targetInstallDir ?? process.cwd());
  await fs.mkdir(target, { recursive: true });
  const previous = await readLockfile(target);
  const selectors =
    typeof packageSelector === 'string' ? [packageSelector] : packageSelector;
  const requested = selectors?.length
    ? [
        ...new Map([
          ...Object.entries(previous.dependencies).map(
            ([name, locator]): [string, string] => [
              name,
              previous.packages[locator]?.version ?? '*',
            ],
          ),
          ...selectors.map(parseSelector),
        ]).entries(),
      ]
    : Object.entries(
        Object.keys(previous.dependencies).length
          ? Object.fromEntries(
              Object.entries(previous.dependencies).map(([name, locator]) => [
                name,
                previous.packages[locator]?.version ?? '*',
              ]),
            )
          : await readRootDependencies(target),
      );
  if (!requested.length) throw new Error('No dependencies to install');

  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-resolve-'));
  const nodes = new Map<string, ResolvedNode>();
  const rootVersions = new Map<string, string>();
  const resolving = new Set<string>();
  const reused: string[] = [];
  try {
    for (const [name, range] of requested.sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      await resolve(name, range, '', true);
    }

    const lock: SkillLockfile = {
      lockfileVersion: 1,
      dependencies: {},
      packages: {},
    };
    const operations: Array<{ source: string; destination: string }> = [];
    for (const node of nodes.values()) {
      const base = node.root
        ? target
        : path.join(target, '.skills_nested', safeLocator(node.locator));
      const mappings = selectedMappings(node.manifest, options.providers ?? []);
      for (const [destination, source] of mappings) {
        operations.push({
          source: safePath(node.extracted, source),
          destination: safePath(base, destination),
        });
      }
      const mappedFiles = mappings.map(([destination]) => destination).sort();
      const installedManifest = path.join(
        workspace,
        `${safeLocator(node.locator)}.skills.yml`,
      );
      await fs.writeFile(
        installedManifest,
        stringifyYaml(
          installedManifestFor(node.manifest, options.providers ?? []),
        ),
      );
      operations.push({
        source: installedManifest,
        destination: path.join(
          target,
          '.skills_metadata',
          safeLocator(node.locator),
          'skills.yml',
        ),
      });
      lock.packages[node.locator] = {
        version: node.version,
        resolved: await packageUrl(node.name, node.version, '/bundle'),
        integrity: sri(node.metadata.hash),
        isCertified: node.metadata.isCertified ?? false,
        mappedFiles,
        ...(Object.keys(node.manifest.dependencies).length
          ? { dependencies: node.manifest.dependencies }
          : {}),
      };
      if (node.root) lock.dependencies[node.name] = node.locator;
    }
    assertNoCollisions(operations);
    await commit(target, operations, lock);
    return {
      targetInstallDir: target,
      lockfilePath: path.join(target, LOCKFILE),
      installed: [...nodes.keys()].filter(
        (locator) => !reused.includes(locator),
      ),
      reused,
      rootLocators: [...nodes.values()]
        .filter((node) => node.root)
        .map((node) => node.locator),
      isolatedLocators: [...nodes.values()]
        .filter((node) => !node.root)
        .map((node) => node.locator),
    };
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }

  async function resolve(
    name: string,
    range: string,
    parentLocator: string,
    direct: boolean,
  ): Promise<string> {
    const rootVersion = rootVersions.get(name);
    let root = direct || !rootVersion || satisfies(rootVersion, range);
    if (rootVersion && !satisfies(rootVersion, range)) root = false;
    const lockedLocator = root
      ? previous.dependencies[name]
      : Object.keys(previous.packages).find(
          (key) =>
            key.startsWith(`${parentLocator}>${name}@`) &&
            satisfies(previous.packages[key].version, range),
        );
    const locked = lockedLocator && previous.packages[lockedLocator];
    const metadata =
      !options.force && locked && satisfies(locked.version, range)
        ? await exactMetadata(name, locked.version)
        : await chooseVersion(name, range, options.force);
    if (!metadata) throw new Error(`No version of ${name} satisfies ${range}`);
    const locator = root
      ? `${name}@${metadata.version}`
      : `${parentLocator}>${name}@${metadata.version}`;
    if (nodes.has(locator)) return locator;
    if (resolving.has(`${name}@${metadata.version}`)) return locator;
    resolving.add(`${name}@${metadata.version}`);
    if (root) rootVersions.set(name, metadata.version);

    let buffer = !options.force
      ? await readCachedSkill(metadata.hash, options.cacheDir)
      : undefined;
    const downloaded = !buffer;
    if (!buffer) {
      const response = await apiRequest(
        await packageUrl(name, metadata.version, '/bundle'),
        { force: options.force },
      );
      buffer = await readArchiveResponse(response);
    }
    if (buffer.length > ARCHIVE_LIMITS.compressedBytes)
      throw new Error('Archive exceeds compressed byte limit');
    const hash = createHash('sha256').update(buffer).digest('hex');
    if (hash !== metadata.hash.toLowerCase())
      throw new Error(`SHA-256 mismatch for ${name}@${metadata.version}`);
    const extracted = path.join(workspace, safeLocator(locator));
    await unpack(buffer, metadata.hash, extracted);
    const manifest = parseYaml<SkillsManifest>(
      await fs.readFile(path.join(extracted, 'skills.yml'), 'utf8'),
    );
    if (manifest.name !== name || manifest.version !== metadata.version) {
      throw new Error(
        `Manifest identity mismatch for ${name}@${metadata.version}`,
      );
    }
    if (downloaded) {
      try {
        await cacheSkill(
          buffer,
          {
            name,
            version: metadata.version,
            registry: (await loadConfig()).config.registryUrl,
            hash,
          },
          options.cacheDir,
        );
      } catch (error) {
        options.onCacheWarning?.(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    manifest.dependencies ??= {};
    const node = {
      locator,
      name,
      version: metadata.version,
      metadata,
      manifest,
      extracted,
      root,
    };
    nodes.set(locator, node);
    if (locked && locked.integrity === sri(metadata.hash)) reused.push(locator);
    for (const [child, childRange] of Object.entries(
      manifest.dependencies,
    ).sort(([a], [b]) => a.localeCompare(b))) {
      await resolve(child, childRange, locator, false);
    }
    resolving.delete(`${name}@${metadata.version}`);
    return locator;
  }
}

async function chooseVersion(
  name: string,
  range: string,
  force = false,
): Promise<RegistryVersion | undefined> {
  const detail = await apiFetch<RegistryPackage>(await packageUrl(name, ''), {
    force,
  });
  const versions = (detail.versions ?? []).map((item) =>
    typeof item === 'string' ? item : item.version,
  );
  const version = versions
    .filter((candidate) => satisfies(candidate, range))
    .sort(compareVersions)
    .at(-1);
  return version ? exactMetadata(name, version, force) : undefined;
}

async function exactMetadata(
  name: string,
  version: string,
  force = false,
): Promise<RegistryVersion> {
  return apiFetch(await packageUrl(name, version), { force });
}

async function packageUrl(
  name: string,
  version: string,
  suffix = '',
): Promise<string> {
  const base = (await loadConfig()).config.registryUrl.replace(/\/$/, '');
  const encoded = encodeURIComponent(name);
  return version
    ? `${base}/package/${encoded}/${encodeURIComponent(version)}${suffix}`
    : `${base}/package/${encoded}`;
}

async function readRootDependencies(
  target: string,
): Promise<Record<string, string>> {
  const canonical = path.join(target, 'skills.yml');
  try {
    const manifest = parseYaml<SkillsManifest>(
      await fs.readFile(canonical, 'utf8'),
    );
    return manifest.dependencies ?? {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const legacy = path.join(target, 'skill.yml');
  try {
    const manifest = JSON.parse(await fs.readFile(legacy, 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    return manifest.dependencies ?? {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      throw new Error(`Missing root skills.yml: ${canonical}`);
    throw error;
  }
}

async function readLockfile(target: string): Promise<SkillLockfile> {
  for (const filename of [LOCKFILE, ...LEGACY_LOCKFILES]) {
    try {
      const raw = await fs.readFile(path.join(target, filename), 'utf8');
      if (!raw.trim()) return migrateFlatLock({});
      const parsed = parseYaml<unknown>(raw);
      // Older actions wrote one name@version per line, despite the .yml suffix.
      if (typeof parsed === 'string') {
        const entries: Record<string, LockedPackage> = {};
        for (const line of raw
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean)) {
          const [name, version] = parseSelector(line);
          if (
            !name ||
            !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)
          ) {
            throw new Error(`Invalid legacy lockfile entry: ${line}`);
          }
          entries[name] = {
            version,
            resolved: await packageUrl(name, version, '/bundle'),
            integrity: '',
            isCertified: false,
            mappedFiles: [],
          };
        }
        return migrateFlatLock(entries);
      }
      if (!parsed || typeof parsed !== 'object')
        throw new Error(`Invalid lockfile: ${filename}`);
      const value = parsed as Partial<SkillLockfile>;
      if (value.lockfileVersion === 1 && value.dependencies && value.packages)
        return value as SkillLockfile;
      const flat = value.dependencies as unknown as Record<
        string,
        LockedPackage
      >;
      if (value.lockfileVersion === 1 && flat && !value.packages) {
        return migrateFlatLock(flat);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  try {
    const legacy = JSON.parse(
      await fs.readFile(
        path.join(target, '.quark', 'skills', 'skill.lock'),
        'utf8',
      ),
    ) as {
      schemaVersion?: number;
      packages?: Record<
        string,
        {
          version: string;
          hash?: string;
          source?: string;
          dependencies?: Record<string, string>;
        }
      >;
    };
    if (legacy.schemaVersion === 1 && legacy.packages) {
      const migrated: SkillLockfile = {
        lockfileVersion: 1,
        dependencies: {},
        packages: {},
      };
      for (const [legacyLocator, entry] of Object.entries(legacy.packages)) {
        const name = legacyLocator.slice(
          0,
          legacyLocator.length - entry.version.length - 1,
        );
        const locator = `${name}@${entry.version}`;
        migrated.dependencies[name] = locator;
        migrated.packages[locator] = {
          version: entry.version,
          resolved: await packageUrl(name, entry.version, '/bundle'),
          integrity:
            entry.hash && /^[a-f0-9]{64}$/i.test(entry.hash)
              ? sri(entry.hash)
              : '',
          isCertified: false,
          mappedFiles: [],
          ...(entry.dependencies ? { dependencies: entry.dependencies } : {}),
        };
      }
      return migrated;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return { lockfileVersion: 1, dependencies: {}, packages: {} };
}

function migrateFlatLock(
  dependencies: Record<string, LockedPackage>,
): SkillLockfile {
  const migrated: SkillLockfile = {
    lockfileVersion: 1,
    dependencies: {},
    packages: {},
  };
  for (const [name, entry] of Object.entries(dependencies)) {
    const locator = `${name}@${entry.version}`;
    migrated.dependencies[name] = locator;
    migrated.packages[locator] = entry;
  }
  return migrated;
}

async function commit(
  target: string,
  operations: Array<{ source: string; destination: string }>,
  lock: SkillLockfile,
): Promise<void> {
  const project = await InstallDirectory.open(target);
  try {
    // Reject all existing linked destinations before creating or moving project files.
    for (const operation of operations)
      await project.assertFile(path.relative(target, operation.destination));
    await project.assertFile(LOCKFILE);
    const { name: transactionName, directory: transaction } =
      await project.temporary();
    const applied: Array<{
      relative: string;
      backup: string;
      backedUp: boolean;
      replaced: boolean;
    }> = [];
    let retainBackup = false;
    const replace = async (
      relative: string,
      stagedRelative: string,
      backupRelative: string,
    ) => {
      await project.withEntry(relative, true, async (destination) => {
        await assertRegularFileOrAbsent(destination);
        await transaction.withEntry(backupRelative, true, async (backup) => {
          const state = {
            relative,
            backup: backupRelative,
            backedUp: false,
            replaced: false,
          };
          applied.push(state);
          try {
            await fs.rename(destination, backup);
            state.backedUp = true;
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
          await transaction.withEntry(stagedRelative, false, async (staged) => {
            await fs.rename(staged, destination);
            state.replaced = true;
          });
        });
      });
      await project.assertFile(relative);
    };
    try {
      for (const operation of operations) {
        const relative = path.relative(target, operation.destination);
        await transaction.withEntry(
          `files/${relative}`,
          true,
          async (staged) => {
            await fs.copyFile(
              operation.source,
              staged,
              fsConstants.COPYFILE_EXCL,
            );
          },
        );
      }
      for (const operation of operations) {
        const relative = path.relative(target, operation.destination);
        await replace(relative, `files/${relative}`, `backups/${relative}`);
      }
      await transaction.withEntry('new-lock.yml', true, async (lockTemp) => {
        await fs.writeFile(lockTemp, stringifyYaml(lock), { flag: 'wx' });
      });
      await replace(LOCKFILE, 'new-lock.yml', 'previous-lock.yml');
    } catch (error) {
      const failures: unknown[] = [];
      for (const state of applied.reverse()) {
        if (!state.backedUp && !state.replaced) continue;
        try {
          await project.withEntry(state.relative, true, async (destination) => {
            await assertRegularFileOrAbsent(destination);
            if (state.backedUp) {
              await transaction.withEntry(state.backup, false, (backup) =>
                fs.rename(backup, destination),
              );
            } else if (state.replaced)
              await fs.rm(destination, { force: true });
          });
        } catch (failure) {
          failures.push(failure);
        }
      }
      if (failures.length) {
        retainBackup = true;
        throw Object.assign(
          new Error(
            `${error instanceof Error ? error.message : String(error)}; Install rollback incomplete; backups retained in ${path.join(target, transactionName)}`,
          ),
          { errors: [error, ...failures] },
        );
      }
      throw error;
    } finally {
      await transaction.close();
      if (!retainBackup)
        await project.withEntry(transactionName, false, (entry) =>
          fs.rm(entry, { recursive: true, force: true }),
        );
    }
  } finally {
    await project.close();
  }
}

function selectedMappings(
  manifest: SkillsManifest,
  providers: string[],
): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  for (const provider of ['.', ...providers]) {
    for (const entry of Object.entries(manifest.files[provider]?.agents ?? {}))
      result.push(entry);
  }
  return result;
}

function installedManifestFor(
  manifest: SkillsManifest,
  providers: string[],
): SkillsManifest {
  const files: SkillsManifest['files'] = {};
  for (const provider of ['.', ...providers]) {
    const mapping = manifest.files[provider];
    if (mapping) files[provider] = mapping;
  }
  return { ...manifest, files };
}

function assertNoCollisions(operations: Array<{ destination: string }>): void {
  const seen = new Set<string>();
  for (const { destination } of operations) {
    if (seen.has(destination))
      throw new Error(`Mapped file collision: ${destination}`);
    seen.add(destination);
  }
}

function parseSelector(selector: string): [string, string] {
  const index = selector.startsWith('@')
    ? selector.indexOf('@', selector.indexOf('/') + 1)
    : selector.lastIndexOf('@');
  return index > 0
    ? [selector.slice(0, index), selector.slice(index + 1) || '*']
    : [selector, '*'];
}

function safePath(root: string, relative: string): string {
  const value = path.resolve(root, relative);
  const difference = path.relative(path.resolve(root), value);
  if (difference.startsWith('..') || path.isAbsolute(difference))
    throw new Error(`Unsafe path: ${relative}`);
  return value;
}

function safeLocator(locator: string): string {
  return locator.replace(/[^a-zA-Z0-9._-]+/g, '_');
}
function sri(hash: string): string {
  return `sha256-${Buffer.from(hash, 'hex').toString('base64')}`;
}

function compareVersions(a: string, b: string): number {
  return compare(a, b) || a.localeCompare(b);
}

function satisfies(version: string, range: string): boolean {
  const normalized = range.trim().toLowerCase() === 'latest' ? '*' : range;
  if (!validRange(normalized))
    throw new Error(`Invalid version range: ${range}`);
  const exact = normalized.trim().replace(/^[=v\s]+/, '');
  if (valid(exact) && exact.includes('+')) return version === exact;
  return Boolean(valid(version)) && semverSatisfies(version, normalized);
}

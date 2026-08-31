import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { apiFetch, apiRequest, Client } from '@quark/registry';
import { cacheSkill, readCachedSkill } from '@quark/local-store';
import {
  parseYaml,
  stringifyYaml,
  unpack,
  type SkillsManifest,
} from '@quark/targz';

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
  packageSelector?: string,
  options: RecursiveInstallOptions = {},
): Promise<InstallResult> {
  const target = path.resolve(options.targetInstallDir ?? process.cwd());
  await fs.mkdir(target, { recursive: true });
  const previous = await readLockfile(target);
  const requested = packageSelector
    ? [parseSelector(packageSelector)]
    : Object.entries(await readRootDependencies(target));
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
        resolved: packageUrl(node.name, node.version, '/bundle'),
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
      !options.force && locked
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
        packageUrl(name, metadata.version, '/bundle'),
        { force: options.force },
      );
      buffer = Buffer.from(await response.arrayBuffer());
    }
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
            registry: Client.API,
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
  const detail = await apiFetch<RegistryPackage>(packageUrl(name, ''), {
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

function exactMetadata(
  name: string,
  version: string,
  force = false,
): Promise<RegistryVersion> {
  return apiFetch(packageUrl(name, version), { force });
}

function packageUrl(name: string, version: string, suffix = ''): string {
  const base = Client.API.replace(/\/$/, '');
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
  const legacy = path.join(target, 'skill.json');
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
      const value = parseYaml<Partial<SkillLockfile>>(
        await fs.readFile(path.join(target, filename), 'utf8'),
      );
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
          resolved: packageUrl(name, entry.version, '/bundle'),
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
  const transaction = await fs.mkdtemp(
    path.join(target, '.quark-transaction-'),
  );
  const staged = path.join(transaction, 'files');
  const backups = path.join(transaction, 'backups');
  const applied: string[] = [];
  try {
    for (const operation of operations) {
      const relative = path.relative(target, operation.destination);
      const stagedFile = safePath(staged, relative);
      await fs.mkdir(path.dirname(stagedFile), { recursive: true });
      await fs.copyFile(operation.source, stagedFile);
    }
    for (const operation of operations) {
      const relative = path.relative(target, operation.destination);
      const backup = safePath(backups, relative);
      await fs.mkdir(path.dirname(operation.destination), { recursive: true });
      try {
        await fs.mkdir(path.dirname(backup), { recursive: true });
        await fs.rename(operation.destination, backup);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      await fs.rename(safePath(staged, relative), operation.destination);
      applied.push(relative);
    }
    const lockTemp = path.join(transaction, LOCKFILE);
    await fs.writeFile(lockTemp, stringifyYaml(lock), { flag: 'wx' });
    const lockPath = path.join(target, LOCKFILE);
    const lockBackup = path.join(transaction, 'previous-lock.yml');
    try {
      await fs.rename(lockPath, lockBackup);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await fs.rename(lockTemp, lockPath);
  } catch (error) {
    for (const relative of applied.reverse()) {
      await fs.rm(safePath(target, relative), { force: true });
      const backup = safePath(backups, relative);
      try {
        await fs.mkdir(path.dirname(safePath(target, relative)), {
          recursive: true,
        });
        await fs.rename(backup, safePath(target, relative));
      } catch {
        /* best effort rollback */
      }
    }
    throw error;
  } finally {
    await fs.rm(transaction, { recursive: true, force: true });
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
  const av = numericVersion(a);
  const bv = numericVersion(b);
  return av[0] - bv[0] || av[1] - bv[1] || av[2] - bv[2] || a.localeCompare(b);
}

function satisfies(version: string, range: string): boolean {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version))
    return false;
  const value = numericVersion(version);
  return range.split('||').some((alternative) =>
    alternative
      .trim()
      .split(/\s+/)
      .every((part) => {
        if (!part || part === '*' || part.toLowerCase() === 'latest')
          return true;
        if (part.startsWith('^')) {
          const min = numericVersion(part.slice(1));
          const max = min[0] ? [min[0] + 1, 0, 0] : [0, min[1] + 1, 0];
          return compareTuple(value, min) >= 0 && compareTuple(value, max) < 0;
        }
        if (part.startsWith('~')) {
          const min = numericVersion(part.slice(1));
          return (
            compareTuple(value, min) >= 0 &&
            compareTuple(value, [min[0], min[1] + 1, 0]) < 0
          );
        }
        const match = part.match(/^(>=|<=|>|<|=)?(.+)$/);
        if (!match) return false;
        if (/[xX*]/.test(match[2])) {
          const pieces = match[2].split('.');
          return pieces.every(
            (piece, index) =>
              /[xX*]/.test(piece) || Number(piece) === value[index],
          );
        }
        const comparison = compareTuple(value, numericVersion(match[2]));
        return match[1] === '>='
          ? comparison >= 0
          : match[1] === '<='
            ? comparison <= 0
            : match[1] === '>'
              ? comparison > 0
              : match[1] === '<'
                ? comparison < 0
                : comparison === 0;
      }),
  );
}

function numericVersion(version: string): [number, number, number] {
  const match = version
    .trim()
    .replace(/^v/, '')
    .match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return [-1, -1, -1];
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}
function compareTuple(a: number[], b: number[]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

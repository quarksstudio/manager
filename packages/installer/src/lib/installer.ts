import { createHash } from 'crypto';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as tar from 'tar';
import { Client, apiFetch, apiRequest } from '@quark/registry';
import { parseManifest } from '@quark/manifest';
import {
  cacheSkill,
  getSkillPath,
  readCachedSkill,
  registerInstall,
  unregisterInstall,
} from '@quark/local-store';
import { validatePermissions, type UserPolicy } from '@quark/permissions';
import {
  InstallSkillHandler,
  type InstallSkillCommand,
  type InstallWorkflow,
} from '../application';
import {
  install as installRecursive,
  type InstallResult,
  type RecursiveInstallOptions,
} from './recursive-installer';

interface RegistryVersion {
  version: string;
  hash: string;
  manifest: unknown;
}

export interface InstallOptions extends RecursiveInstallOptions {
  policy?: UserPolicy;
  approvePermissions?: (
    denied: ReturnType<typeof validatePermissions>['deniedPermissions'],
  ) => Promise<boolean>;
  onCacheWarning?: (error: Error) => void;
}

export type {
  InstallResult,
  LockedPackage,
  SkillLockfile,
} from './recursive-installer';
export { PackageNotFound, uninstall, type UninstallStep } from './uninstaller';

export async function install(
  packageSelector?: string | string[],
  options: InstallOptions = {},
): Promise<InstallResult> {
  return installRecursive(packageSelector, options);
}

const MAX_FILES = 10_000;
const MAX_PATH_LENGTH = 1_024;
const MAX_UNPACKED_BYTES = 250 * 1024 * 1024;

function packageUrl(name: string, version: string, suffix = ''): string {
  const base = Client.API.replace(/\/$/, '');
  return `${base}/package/${encodeURIComponent(name)}/${encodeURIComponent(version)}${suffix}`;
}

function validateEntry(entryPath: string, type: string): void {
  const normalized = entryPath.replace(/\\/g, '/');
  if (
    normalized.length > MAX_PATH_LENGTH ||
    normalized.startsWith('/') ||
    normalized.split('/').includes('..') ||
    !(normalized === 'package' || normalized.startsWith('package/'))
  ) {
    throw new Error(`Unsafe bundle path: ${entryPath}`);
  }
  if (type === 'SymbolicLink' || type === 'Link') {
    throw new Error(`Bundle links are not allowed: ${entryPath}`);
  }
}

async function performInstallSkill(
  name: string,
  version: string,
  isGlobal = false,
  cwd = process.cwd(),
  options: InstallOptions = {},
  resolvedMetadata?: RegistryVersion,
): Promise<void> {
  const finalDest = getSkillPath(name, version, isGlobal, cwd);
  if (fs.existsSync(finalDest))
    throw new Error(`Skill is already installed: ${name}@${version}`);

  let metadata = resolvedMetadata;
  if (!metadata) {
    metadata = await apiFetch<RegistryVersion>(packageUrl(name, version), {
      useCache: false,
    });
  }
  if (!/^[a-f0-9]{64}$/i.test(metadata.hash))
    throw new Error('Registry returned an invalid bundle hash');
  const publishedManifest = parseManifest(metadata.manifest);
  if (
    publishedManifest.name !== name ||
    publishedManifest.version !== version
  ) {
    throw new Error(
      'Registry manifest does not match the requested package and version',
    );
  }
  const permissionResult = validatePermissions(
    publishedManifest,
    options.policy || {},
  );
  if (!permissionResult.granted) {
    const approved = options.approvePermissions
      ? await options.approvePermissions(permissionResult.deniedPermissions)
      : false;
    if (!approved)
      throw new Error(
        'Installation denied because required permissions were not approved',
      );
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quark-install-'));
  const tarballPath = path.join(tempDir, 'package.tgz');
  const installParent = path.dirname(finalDest);
  fs.mkdirSync(installParent, { recursive: true });
  const extractDir = fs.mkdtempSync(path.join(installParent, '.quark-stage-'));
  try {
    let bundle = !options.force
      ? await readCachedSkill(metadata.hash, options.cacheDir)
      : undefined;
    const downloaded = !bundle;
    if (!bundle) {
      const bundleResponse = await apiRequest(
        packageUrl(name, version, '/bundle'),
        { useCache: false, force: options.force },
      );
      bundle = Buffer.from(await bundleResponse.arrayBuffer());
    }
    const actualHash = createHash('sha256').update(bundle).digest('hex');
    if (actualHash.toLowerCase() !== metadata.hash.toLowerCase()) {
      throw new Error('Bundle integrity check failed: SHA-256 mismatch');
    }
    fs.writeFileSync(tarballPath, bundle, { flag: 'wx' });

    const seen = new Set<string>();
    let fileCount = 0;
    let unpackedBytes = 0;
    await tar.t({
      file: tarballPath,
      strict: true,
      onentry: (entry) => {
        validateEntry(entry.path, entry.type);
        if (seen.has(entry.path))
          throw new Error(`Duplicate bundle path: ${entry.path}`);
        seen.add(entry.path);
        if (++fileCount > MAX_FILES)
          throw new Error('Bundle contains too many files');
        unpackedBytes += entry.size;
        if (unpackedBytes > MAX_UNPACKED_BYTES)
          throw new Error('Bundle is too large when unpacked');
      },
    });
    if (!seen.has('package/skill.json'))
      throw new Error('Bundle does not contain package/skill.json');

    await tar.x({
      file: tarballPath,
      cwd: extractDir,
      strict: true,
      preservePaths: false,
    });
    const stagedPackage = path.join(extractDir, 'package');
    const manifest = parseManifest(
      JSON.parse(
        fs.readFileSync(path.join(stagedPackage, 'skill.json'), 'utf8'),
      ),
    );
    if (manifest.name !== name || manifest.version !== version) {
      throw new Error(
        'Extracted manifest does not match the requested package and version',
      );
    }
    if (JSON.stringify(manifest) !== JSON.stringify(publishedManifest)) {
      throw new Error('Extracted manifest differs from registry metadata');
    }
    if (downloaded) {
      try {
        await cacheSkill(
          bundle,
          {
            name,
            version,
            registry: Client.API,
            hash: actualHash,
          },
          options.cacheDir,
        );
      } catch (error) {
        options.onCacheWarning?.(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    const entrypoint = path.resolve(stagedPackage, manifest.entrypoint);
    if (
      !entrypoint.startsWith(`${path.resolve(stagedPackage)}${path.sep}`) ||
      !fs.existsSync(entrypoint)
    ) {
      throw new Error('Manifest entrypoint is missing or outside the package');
    }

    fs.renameSync(stagedPackage, finalDest);
    try {
      registerInstall(name, version, isGlobal, cwd, {
        hash: actualHash,
        source: Client.API,
        dependencies: manifest.dependencies,
      });
    } catch (error) {
      fs.rmSync(finalDest, { recursive: true, force: true });
      try {
        unregisterInstall(name, version, isGlobal, cwd);
      } catch {
        /* preserve original error */
      }
      throw error;
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

class NodeInstallWorkflow implements InstallWorkflow {
  private metadata?: RegistryVersion;
  constructor(private readonly options: InstallOptions) {}

  async authorize(command: InstallSkillCommand): Promise<void> {
    this.metadata = await apiFetch<RegistryVersion>(
      packageUrl(command.name, command.version),
      { useCache: false },
    );
    const manifest = parseManifest(this.metadata.manifest);
    const result = validatePermissions(manifest, this.options.policy || {});
    if (!result.granted) {
      const approved = this.options.approvePermissions
        ? await this.options.approvePermissions(result.deniedPermissions)
        : false;
      if (!approved)
        throw new Error(
          'Installation denied because required permissions were not approved',
        );
    }
  }

  async verifyAndInstall(command: InstallSkillCommand): Promise<void> {
    await performInstallSkill(
      command.name,
      command.version,
      command.global ?? false,
      command.cwd ?? process.cwd(),
      this.options,
      this.metadata,
    );
  }
}

export async function installSkill(
  name: string,
  version: string,
  isGlobal = false,
  cwd = process.cwd(),
  options: InstallOptions = {},
): Promise<void> {
  const handler = new InstallSkillHandler(new NodeInstallWorkflow(options));
  await handler.execute({ name, version, global: isGlobal, cwd });
}

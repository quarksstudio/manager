import { createHash } from 'crypto';
import { constants as fsConstants, promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as tar from 'tar';

import { readAndValidateManifest } from './manifest';
import { parse } from 'yaml';
import { structuralAudit, type PackageManifest } from '@quark/tester';

const MANIFESTS = ['skill.yml', 'agent.yml', 'skills.yml'] as const;

export async function pack(
  sourceDir: string,
  outputDir = process.cwd(),
): Promise<string> {
  const sourceRoot = path.resolve(sourceDir);
  const { manifestPath, manifestName, manifest, sources } =
    await packageFiles(sourceRoot);
  validateArchiveIdentity(manifest.name, 'name');
  validateArchiveIdentity(manifest.version, 'version');

  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-pack-'));
  const staging = path.join(workspace, 'content');
  const archiveName = `${manifest.name}-${manifest.version}.tar.gz`;
  const temporaryArchive = path.join(workspace, archiveName);
  const destinationRoot = path.resolve(outputDir);
  const destination = path.join(destinationRoot, archiveName);

  try {
    await fs.mkdir(staging);
    await fs.copyFile(manifestPath, path.join(staging, manifestName));
    for (const source of sources) {
      const destinationFile = path.join(staging, ...source.split('/'));
      await fs.mkdir(path.dirname(destinationFile), { recursive: true });
      await fs.copyFile(
        path.join(sourceRoot, ...source.split('/')),
        destinationFile,
      );
    }
    const extras = await copyOptionalContracts(sourceRoot, staging);
    await tar.c({ cwd: staging, file: temporaryArchive, gzip: true }, [
      manifestName,
      ...sources,
      ...extras,
    ]);
    await fs.mkdir(destinationRoot, { recursive: true });
    await moveExclusive(temporaryArchive, destination);
    return destination;
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

export async function check(
  buffer: Buffer,
  expected: { name: string; version: string },
): Promise<boolean> {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('Archive buffer must not be empty');
  }
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-check-'));
  try {
    const extracted = await extractAudited(buffer, workspace);
    const manifest = await extractedManifest(extracted);
    if (
      manifest.name !== expected.name ||
      manifest.version !== expected.version
    ) {
      throw new Error(
        `Archive identity mismatch: expected ${expected.name}@${expected.version}, received ${manifest.name}@${manifest.version}`,
      );
    }
    return true;
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

export async function unpack(
  source: string | Buffer,
  expectedHash: string,
  targetDir: string,
): Promise<void> {
  const buffer = Buffer.isBuffer(source) ? source : await fs.readFile(source);
  const digest = createHash('sha256').update(buffer).digest();
  const actualHash = digest.toString('hex');
  const expected = expectedHash.startsWith('sha256-')
    ? Buffer.from(expectedHash.slice(7), 'base64').toString('hex')
    : expectedHash.toLowerCase();
  if (!/^[a-f0-9]{64}$/i.test(expected) || actualHash !== expected) {
    throw new Error(
      `Archive integrity mismatch: expected ${expectedHash}, received ${actualHash}`,
    );
  }

  const target = path.resolve(targetDir);
  const parent = path.dirname(target);
  await fs.mkdir(parent, { recursive: true });
  const workspace = await fs.mkdtemp(path.join(parent, '.quark-unpack-'));
  try {
    const extracted = await extractAudited(buffer, workspace);
    await extractedManifest(extracted);
    await ensureEmptyTarget(target);
    await fs.rename(extracted, target);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

async function extractAudited(
  buffer: Buffer,
  workspace: string,
): Promise<string> {
  const archive = path.join(workspace, 'archive.tar.gz');
  const extracted = path.join(workspace, 'content');
  await fs.writeFile(archive, buffer, { flag: 'wx' });
  await auditArchive(archive);
  await fs.mkdir(extracted);
  try {
    await tar.x({
      cwd: extracted,
      file: archive,
      preservePaths: false,
      strict: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid tar.gz archive: ${message}`);
  }
  return extracted;
}

async function auditArchive(archive: string): Promise<void> {
  const seen = new Set<string>();
  let auditError: Error | undefined;
  try {
    await tar.t({
      file: archive,
      strict: true,
      onentry: (entry) => {
        if (auditError) return;
        const normalized = entry.path.replace(/\\/g, '/');
        if (
          !normalized ||
          normalized.includes('\0') ||
          normalized.startsWith('/') ||
          /^[a-zA-Z]:\//.test(normalized) ||
          path.posix.normalize(normalized).split('/').includes('..')
        ) {
          auditError = new Error(`Unsafe archive path: ${entry.path}`);
          return;
        }
        if (entry.type === 'SymbolicLink' || entry.type === 'Link') {
          auditError = new Error(
            `Archive links are not allowed: ${entry.path}`,
          );
          return;
        }
        if (seen.has(normalized)) {
          auditError = new Error(`Duplicate archive path: ${entry.path}`);
          return;
        }
        seen.add(normalized);
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid tar.gz archive: ${message}`);
  }
  if (auditError) throw auditError;
  if (!MANIFESTS.some((name) => seen.has(name)))
    throw new Error('Archive must contain skill.yml at its root');
}

async function packageFiles(root: string): Promise<{
  manifestPath: string;
  manifestName: (typeof MANIFESTS)[number];
  manifest: { name: string; version: string };
  sources: string[];
}> {
  for (const manifestName of ['skill.yml', 'agent.yml'] as const) {
    const manifestPath = path.join(root, manifestName);
    try {
      await fs.access(manifestPath);
      const manifest = parse(
        await fs.readFile(manifestPath, 'utf8'),
      ) as PackageManifest;
      const audit = await structuralAudit(root, manifest);
      return {
        manifestPath,
        manifestName,
        manifest,
        sources: audit.mappedSources,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  const legacyPath = path.join(root, 'skills.yml');
  const legacy = await readAndValidateManifest(legacyPath);
  return { manifestPath: legacyPath, manifestName: 'skills.yml', ...legacy };
}

async function extractedManifest(
  root: string,
): Promise<{ name: string; version: string }> {
  for (const filename of ['skill.yml', 'agent.yml']) {
    try {
      return parse(await fs.readFile(path.join(root, filename), 'utf8')) as {
        name: string;
        version: string;
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return (await readAndValidateManifest(path.join(root, 'skills.yml')))
    .manifest;
}

async function copyOptionalContracts(
  source: string,
  target: string,
): Promise<string[]> {
  const copied: string[] = [];
  for (const filename of [
    'skill.test.yml',
    'agent.test.yml',
    'skill.audit.yml',
    'skill.lock.yml',
    'agent.lock.yml',
  ]) {
    try {
      await fs.copyFile(
        path.join(source, filename),
        path.join(target, filename),
      );
      copied.push(filename);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  try {
    await fs.cp(path.join(source, 'schemas'), path.join(target, 'schemas'), {
      recursive: true,
    });
    const visit = async (dir: string, prefix = 'schemas'): Promise<void> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const relative = path.posix.join(prefix, entry.name);
        if (entry.isDirectory())
          await visit(path.join(dir, entry.name), relative);
        else if (entry.isFile()) copied.push(relative);
      }
    };
    await visit(path.join(source, 'schemas'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return copied;
}

async function ensureEmptyTarget(target: string): Promise<void> {
  try {
    const stat = await fs.lstat(target);
    if (!stat.isDirectory() || (await fs.readdir(target)).length) {
      throw new Error(
        `Target directory must not exist or must be empty: ${target}`,
      );
    }
    await fs.rmdir(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function moveExclusive(
  source: string,
  destination: string,
): Promise<void> {
  try {
    await fs.copyFile(source, destination, fsConstants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`Archive already exists: ${destination}`);
    }
    throw error;
  }
  await fs.rm(source, { force: true });
}

function validateArchiveIdentity(value: string, field: string): void {
  if (value.includes('/') || value.includes('\\') || value.includes('\0')) {
    throw new Error(`Manifest ${field} cannot be used in an archive filename`);
  }
}

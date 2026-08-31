import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as tar from 'tar';

import { readManifest } from '../../contracts';
import type { PackageManifest } from '../../types';
import { structuralAudit } from './index';

const MAX_FILES = 10_000;
const MAX_PATH_LENGTH = 1_024;
const MAX_UNPACKED_BYTES = 250 * 1024 * 1024;

export interface PackageArchiveInspection {
  hash: string;
  sizeBytes: number;
  files: string[];
  manifest: PackageManifest;
}

export async function inspectPackageArchive(
  buffer: Buffer,
  expected: { name: string; version: string },
): Promise<PackageArchiveInspection> {
  if (!Buffer.isBuffer(buffer) || buffer.length < 2) throw new Error('Archive buffer must not be empty');
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'manager-tier1-'));
  const archive = path.join(workspace, 'bundle.tgz');
  const extracted = path.join(workspace, 'content');
  try {
    await fs.writeFile(archive, buffer, { flag: 'wx' });
    const files = await auditTarArchive(buffer);
    if (!files.includes('skill.yml')) throw new Error('Archive must contain skill.yml at its root');
    await fs.mkdir(extracted);
    await tar.x({ file: archive, cwd: extracted, strict: true, preservePaths: false });
    const manifest = await readManifest(extracted);
    await structuralAudit(extracted, manifest);
    if (manifest.name !== expected.name || manifest.version !== expected.version) throw new Error(`Archive identity mismatch: expected ${expected.name}@${expected.version}`);
    return { hash: createHash('sha256').update(buffer).digest('hex'), sizeBytes: buffer.byteLength, files, manifest };
  } finally { await fs.rm(workspace, { recursive: true, force: true }); }
}

export async function auditTarArchive(source: string | Buffer): Promise<string[]> {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'manager-archive-audit-'));
  const archive = path.join(workspace, 'package.tar.gz');
  try {
    if (Buffer.isBuffer(source)) await fs.writeFile(archive, source, { flag: 'wx' });
    else await fs.copyFile(source, archive);
    const entries: string[] = []; const seen = new Set<string>(); let auditError: Error | undefined; let unpackedBytes = 0;
    await tar.t({ file: archive, strict: true, onentry: (entry) => {
      if (auditError) return;
      const normalized = entry.path.replace(/\\/g, '/');
      if (!normalized || normalized.length > MAX_PATH_LENGTH || normalized.includes('\0') || normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized) || path.posix.normalize(normalized).split('/').includes('..')) auditError = new Error(`Unsafe archive path: ${entry.path}`);
      else if (entry.type === 'SymbolicLink' || entry.type === 'Link') auditError = new Error(`Archive links are not allowed: ${entry.path}`);
      else if (seen.has(normalized)) auditError = new Error(`Duplicate archive path: ${entry.path}`);
      else {
        seen.add(normalized); entries.push(normalized); unpackedBytes += entry.size;
        if (entries.length > MAX_FILES) auditError = new Error('Archive contains too many files');
        else if (unpackedBytes > MAX_UNPACKED_BYTES) auditError = new Error('Archive is too large when unpacked');
      }
    } });
    if (auditError) throw auditError;
    if (!seen.has('skill.yml') && !seen.has('agent.yml')) throw new Error('Archive must contain skill.yml or agent.yml at its root');
    return entries.sort();
  } finally { await fs.rm(workspace, { recursive: true, force: true }); }
}

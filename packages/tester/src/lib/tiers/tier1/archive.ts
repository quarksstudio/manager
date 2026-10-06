import { promises as fs, createReadStream } from 'fs';
import { Readable, Transform } from 'stream';
import { createGunzip } from 'zlib';
import { createHash } from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as tar from 'tar';

import { readManifest } from '../../contracts';
import type { PackageManifest } from '../../types';
import { structuralAudit } from './index';

export interface ArchiveLimits {
  files: number;
  pathLength: number;
  unpackedBytes: number;
  compressedBytes: number;
  tarBytes: number;
}
export const ARCHIVE_LIMITS: Readonly<ArchiveLimits> = Object.freeze({
  files: 10_000,
  pathLength: 1_024,
  unpackedBytes: 250 * 1024 * 1024,
  compressedBytes: 50 * 1024 * 1024,
  // File padding, tar headers and bounded extended metadata also consume resources.
  tarBytes: 280 * 1024 * 1024,
});

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
  if (!Buffer.isBuffer(buffer) || buffer.length < 2)
    throw new Error('Archive buffer must not be empty');
  if (buffer.length > ARCHIVE_LIMITS.compressedBytes)
    throw new Error('Archive exceeds compressed byte limit');
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'manager-tier1-'));
  const archive = path.join(workspace, 'bundle.tgz');
  const extracted = path.join(workspace, 'content');
  try {
    await fs.writeFile(archive, buffer, { flag: 'wx' });
    const files = await auditTarArchive(buffer);
    await fs.mkdir(extracted);
    await tar.x({
      file: archive,
      cwd: extracted,
      strict: true,
      preservePaths: false,
    });
    const manifest = await readManifest(
      extracted,
      files.includes('skill.yml') ? 'skill.yml' : 'agent.yml',
    );
    await structuralAudit(extracted, manifest);
    if (
      manifest.name !== expected.name ||
      manifest.version !== expected.version
    )
      throw new Error(
        `Archive identity mismatch: expected ${expected.name}@${expected.version}`,
      );
    return {
      hash: createHash('sha256').update(buffer).digest('hex'),
      sizeBytes: buffer.byteLength,
      files,
      manifest,
    };
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

export async function auditTarArchive(
  source: string | Buffer,
  manifests: readonly string[] = ['skill.yml', 'agent.yml'],
  limits: Readonly<ArchiveLimits> = ARCHIVE_LIMITS,
): Promise<string[]> {
  for (const key of Object.keys(ARCHIVE_LIMITS) as Array<keyof ArchiveLimits>) {
    if (
      !Number.isSafeInteger(limits[key]) ||
      limits[key] <= 0 ||
      limits[key] > ARCHIVE_LIMITS[key]
    )
      throw new Error(`Archive limits can only be tightened: ${key}`);
  }
  let gzip: boolean;
  if (Buffer.isBuffer(source)) {
    if (source.length > limits.compressedBytes)
      throw new Error('Archive exceeds compressed byte limit');
    gzip = source[0] === 0x1f && source[1] === 0x8b;
  } else {
    const file = await fs.open(source, 'r');
    try {
      if ((await file.stat()).size > limits.compressedBytes)
        throw new Error('Archive exceeds compressed byte limit');
      const prefix = Buffer.alloc(2);
      await file.read(prefix, 0, 2, 0);
      gzip = prefix[0] === 0x1f && prefix[1] === 0x8b;
    } finally {
      await file.close();
    }
  }
  const input = Buffer.isBuffer(source)
    ? Readable.from([source])
    : createReadStream(source);
  const limit = (maximum: number, message: string) => {
    let bytes = 0;
    return new Transform({
      transform(chunk, _encoding, callback) {
        bytes += chunk.length;
        callback(bytes > maximum ? new Error(message) : null, chunk);
      },
    });
  };
  const compressed = limit(
    limits.compressedBytes,
    'Archive exceeds compressed byte limit',
  );
  const decoded = gzip
    ? createGunzip()
    : new Transform({
        transform(chunk, _encoding, callback) {
          callback(null, chunk);
        },
      });
  const raw = limit(
    limits.tarBytes,
    'Archive exceeds decompressed tar byte limit',
  );
  input.on('error', (error: Error) => compressed.destroy(error));
  compressed.on('error', (error) => decoded.destroy(error));
  decoded.on('error', (error) => raw.destroy(error));
  input.pipe(compressed).pipe(decoded).pipe(raw);
  const entries: string[] = [];
  const seen = new Set<string>();
  let unpackedBytes = 0;
  let auditError: Error | undefined;
  const parser = new tar.Parser({
    strict: true,
    maxMetaEntrySize: limits.pathLength * 4,
    onReadEntry: (entry) => {
      const normalized = entry.path.replace(/\\/g, '/');
      const canonical = path.posix.normalize(normalized).replace(/\/$/, '');
      let error: Error | undefined;
      if (
        !normalized ||
        normalized.length > limits.pathLength ||
        normalized.includes('\0') ||
        normalized.startsWith('/') ||
        /^[A-Za-z]:/.test(normalized) ||
        normalized.split('/').includes('..') ||
        !canonical ||
        (canonical === '.' && entry.type !== 'Directory')
      )
        error = new Error(`Unsafe archive path: ${entry.path}`);
      else if (entry.type === 'SymbolicLink' || entry.type === 'Link')
        error = new Error(`Archive links are not allowed: ${entry.path}`);
      else if (entry.type !== 'File' && entry.type !== 'Directory')
        error = new Error(`Unsupported archive entry type: ${entry.type}`);
      else if (seen.has(canonical))
        error = new Error(`Duplicate archive path: ${entry.path}`);
      else {
        seen.add(canonical);
        entries.push(canonical);
        unpackedBytes += entry.size;
        if (entries.length > limits.files)
          error = new Error('Archive contains too many files');
        else if (
          !Number.isSafeInteger(entry.size) ||
          entry.size < 0 ||
          unpackedBytes > limits.unpackedBytes
        )
          error = new Error('Archive is too large when unpacked');
      }
      entry.resume();
      if (error) {
        auditError = error;
        parser.abort(error);
      }
    },
  });
  parser.on('error', (error) => {
    auditError = error;
  });
  try {
    for await (const chunk of raw) {
      parser.write(chunk);
      if (auditError) throw auditError;
    }
    if (auditError) throw auditError;
    await new Promise<void>((resolve, reject) => {
      parser.once('end', resolve);
      parser.once('error', reject);
      parser.end();
    });
    if (auditError) throw auditError;
    if (!manifests.some((name) => seen.has(name)))
      throw new Error(
        `Archive must contain ${manifests.join(' or ')} at its root`,
      );
    return entries.sort();
  } finally {
    input.destroy();
    compressed.destroy();
    decoded.destroy();
    raw.destroy();
  }
}

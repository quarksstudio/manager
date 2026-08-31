import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

import { requireRegularFile } from '../../path-safety';
import type { PackageManifest } from '../../types';

const wildcard = /[*?{}[\]!]/;

export async function structuralAudit(root: string, manifest: PackageManifest): Promise<{ hash: string; mappedSources: string[] }> {
  const sources = new Set<string>();
  const mappings = manifest.mapper_files;
  if (!mappings || Object.keys(mappings).length === 0) throw new Error('mapper_files must be a non-empty object');
  for (const [provider, groups] of Object.entries(mappings)) {
    for (const [kind, files] of Object.entries(groups)) {
      for (const [target, source] of Object.entries(files ?? {})) {
        assertExplicit(target, `mapper_files.${provider}.${kind} target`);
        assertExplicit(source, `mapper_files.${provider}.${kind} source`);
        await requireRegularFile(root, source);
        sources.add(source.replace(/\\/g, '/'));
      }
    }
  }
  if (!sources.size) throw new Error('mapper_files must map at least one source file');
  return { hash: await canonicalDirectoryHash(root), mappedSources: [...sources].sort() };
}

function assertExplicit(value: string, label: string): void {
  if (wildcard.test(value)) throw new Error(`Wildcards are not allowed in ${label}: ${value}`);
  if (!value.trim()) throw new Error(`${label} must not be empty`);
}

export async function canonicalDirectoryHash(root: string): Promise<string> {
  const hash = createHash('sha256');
  for (const relative of await listFiles(root)) {
    const data = await fs.readFile(path.join(root, relative));
    hash.update(Buffer.from(`${relative}\0${data.length}\0`, 'utf8'));
    hash.update(data);
  }
  return hash.digest('hex');
}

async function listFiles(root: string, current = ''): Promise<string[]> {
  const result: string[] = [];
  const dir = path.join(root, current);
  for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(current.replace(/\\/g, '/'), entry.name);
    if (relative === 'skill.lock.yml' || relative === 'agent.lock.yml' || relative === 'outputs' || relative.startsWith('outputs/')) continue;
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not allowed: ${relative}`);
    if (entry.isDirectory()) result.push(...await listFiles(root, relative));
    else if (entry.isFile()) result.push(relative);
    else throw new Error(`Unsupported package entry: ${relative}`);
  }
  return result;
}

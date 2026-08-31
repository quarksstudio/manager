import { promises as fs } from 'fs';
import * as path from 'path';

import { parse, stringify } from 'yaml';

export interface SkillsManifest {
  name: string;
  version: string;
  description: string;
  files: Record<string, { agents: Record<string, string> }>;
  dependencies: Record<string, string>;
}

export interface ValidatedManifest {
  manifest: SkillsManifest;
  sources: string[];
}

export function parseYaml<T = unknown>(content: string): T {
  return parse(content) as T;
}

export function stringifyYaml(value: unknown): string {
  return stringify(value);
}

export async function validateSchema(manifestPath: string): Promise<boolean> {
  await readAndValidateManifest(manifestPath);
  return true;
}

export async function readAndValidateManifest(
  manifestPath: string,
): Promise<ValidatedManifest> {
  const absoluteManifest = path.resolve(manifestPath);
  let document: unknown;
  try {
    document = parse(await fs.readFile(absoluteManifest, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid skills.yml: ${message}`);
  }

  if (!isRecord(document))
    throw new Error('Invalid skills.yml: expected an object');
  const name = requiredString(document['name'], 'name');
  const version = requiredString(document['version'], 'version');
  const description = requiredString(document['description'], 'description');
  const files = validateFiles(document['files']);
  const dependencies = validateDependencies(document['dependencies']);
  const root = path.dirname(absoluteManifest);
  const sources = new Set<string>();

  for (const [provider, mapping] of Object.entries(files)) {
    for (const [target, source] of Object.entries(mapping.agents)) {
      validateExplicitPath(target, `files.${provider}.agents target`);
      validateExplicitPath(source, `files.${provider}.agents source`);
      const absoluteSource = safeResolve(root, source);
      let stat;
      try {
        stat = await fs.lstat(absoluteSource);
      } catch {
        throw new Error(`Mapped source file does not exist: ${source}`);
      }
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error(`Mapped source must be a regular file: ${source}`);
      }
      const realSource = await fs.realpath(absoluteSource);
      assertInside(
        root,
        realSource,
        `Mapped source escapes manifest root: ${source}`,
      );
      sources.add(normalizeRelative(source));
    }
  }

  return {
    manifest: { name, version, description, files, dependencies },
    sources: [...sources],
  };
}

function validateFiles(
  value: unknown,
): Record<string, { agents: Record<string, string> }> {
  if (!isRecord(value) || !Object.keys(value).length) {
    throw new Error('Invalid skills.yml: files must be a non-empty object');
  }
  const result: Record<string, { agents: Record<string, string> }> = {};
  for (const [provider, providerValue] of Object.entries(value)) {
    if (!isRecord(providerValue) || !isRecord(providerValue['agents'])) {
      throw new Error(
        `Invalid skills.yml: files.${provider}.agents must be an object`,
      );
    }
    const agents: Record<string, string> = {};
    for (const [target, source] of Object.entries(providerValue['agents'])) {
      if (typeof source !== 'string' || !source.trim()) {
        throw new Error(
          `Invalid skills.yml: source for ${target} must be a string`,
        );
      }
      agents[target] = source;
    }
    result[provider] = { agents };
  }
  return result;
}

function validateDependencies(value: unknown): Record<string, string> {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) {
    throw new Error('Invalid skills.yml: dependencies must be an object');
  }
  const result: Record<string, string> = {};
  for (const [name, version] of Object.entries(value)) {
    if (!name.trim() || typeof version !== 'string' || !version.trim()) {
      throw new Error(
        'Invalid skills.yml: dependency versions must be strings',
      );
    }
    result[name] = version;
  }
  return result;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid skills.yml: ${field} must be a non-empty string`);
  }
  return value;
}

function validateExplicitPath(value: string, label: string): void {
  if (/[*?{}[\]!]/.test(value)) {
    throw new Error(`Wildcards are not allowed in ${label}: ${value}`);
  }
  if (
    !value ||
    value.includes('\0') ||
    path.isAbsolute(value) ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    normalizeRelative(value).split('/').includes('..')
  ) {
    throw new Error(`Unsafe relative path in ${label}: ${value}`);
  }
}

function normalizeRelative(value: string): string {
  return path.posix.normalize(value.replace(/\\/g, '/').replace(/^\.\//, ''));
}

function safeResolve(root: string, relative: string): string {
  const resolved = path.resolve(root, normalizeRelative(relative));
  assertInside(root, resolved, `Path escapes manifest root: ${relative}`);
  return resolved;
}

function assertInside(root: string, candidate: string, message: string): void {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

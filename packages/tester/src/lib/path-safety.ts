import { promises as fs } from 'fs';
import * as path from 'path';

export function safePath(root: string, relative: string): string {
  if (
    !relative ||
    relative.includes('\0') ||
    path.isAbsolute(relative) ||
    /^[A-Za-z]:[\\/]/.test(relative)
  )
    throw new Error(`Unsafe relative path: ${relative}`);
  const resolved = path.resolve(root, relative);
  const difference = path.relative(path.resolve(root), resolved);
  if (difference.startsWith('..') || path.isAbsolute(difference))
    throw new Error(`Path escapes package root: ${relative}`);
  return resolved;
}

export async function requireRegularFile(
  root: string,
  relative: string,
): Promise<string> {
  const resolved = safePath(root, relative);
  const stat = await fs.lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error(`Expected regular file: ${relative}`);
  const real = await fs.realpath(resolved);
  safePath(root, path.relative(root, real));
  return resolved;
}

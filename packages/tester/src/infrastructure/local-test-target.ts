import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export async function inspectLocalTestTarget(
  directory?: string,
): Promise<{ targetDir: string; kind: 'agent' | 'skill' }> {
  const targetDir = path.resolve(directory ?? process.cwd());
  const stat = await fs.stat(targetDir).catch(() => null);
  if (!stat?.isDirectory())
    throw new Error(`Test target is not a directory: ${targetDir}`);
  if (await exists(path.join(targetDir, 'agent.yml')))
    return { targetDir, kind: 'agent' };
  if (await exists(path.join(targetDir, 'skill.yml')))
    return { targetDir, kind: 'skill' };
  throw new Error(`No skill.yml or agent.yml found in ${targetDir}`);
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

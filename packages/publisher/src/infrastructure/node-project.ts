import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseYaml, stringifyYaml } from '@quark/targz';
import type { PublicationProject } from '../application/ports';

export const nodeProject: PublicationProject = {
  async inspect(sourceDir) {
    const root = path.resolve(sourceDir ?? process.cwd());
    let kind: 'agent' | 'skill' = 'agent';
    try {
      await fs.access(path.join(root, 'agent.yml'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      kind = 'skill';
    }
    const manifest = parseYaml<Record<string, unknown>>(
      await fs.readFile(path.join(root, `${kind}.yml`), 'utf8'),
    );
    return {
      root,
      kind,
      manifest,
      packageName: String(manifest['name'] ?? path.basename(root)),
      version: String(manifest['version'] ?? '0.0.0'),
    };
  },
  async writeSnapshot(source, snapshot) {
    const destination = path.join(source.root, `${source.kind}.lock.yml`);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, stringifyYaml(snapshot), {
        flag: 'wx',
        mode: 0o600,
      });
      await fs.rename(temporary, destination);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  },
  async readArchive(archive) {
    return {
      fileName: path.basename(archive),
      content: await fs.readFile(archive),
    };
  },
};

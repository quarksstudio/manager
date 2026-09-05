import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as tar from 'tar';

import { auditTarArchive, inspectPackageArchive } from './archive';

describe('archive audit', () => {
  it('accepts a rooted skill archive and rejects traversal', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archive-spec-'));
    try {
      await fs.writeFile(path.join(root, 'skill.yml'), 'name: demo');
      const valid = path.join(root, 'valid.tar.gz');
      await tar.c({ cwd: root, file: valid, gzip: true }, ['skill.yml']);
      await expect(auditTarArchive(valid)).resolves.toContain('skill.yml');
      const unsafe = path.join(root, 'unsafe.tar.gz');
      await tar.c({ cwd: root, file: unsafe, gzip: true, prefix: '../' }, [
        'skill.yml',
      ]);
      await expect(auditTarArchive(unsafe)).rejects.toThrow(
        'Unsafe archive path',
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('performs the complete Tier 1 archive inspection', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'inspection-spec-'));
    try {
      await fs.mkdir(path.join(root, 'src'));
      await fs.writeFile(path.join(root, 'src', 'tool.py'), 'print("ok")');
      await fs.writeFile(
        path.join(root, 'skill.yml'),
        [
          'name: demo',
          'version: 1.0.0',
          'description: Demo package',
          'runtime: python',
          'testCommand: python src/tool.py',
          'mapper_files:',
          '  ".":',
          '    tools:',
          '      tools/demo.py: src/tool.py',
          '',
        ].join('\n'),
      );
      const archive = path.join(root, 'demo.tgz');
      await tar.c({ cwd: root, file: archive, gzip: true }, [
        'skill.yml',
        'src/tool.py',
      ]);
      const buffer = await fs.readFile(archive);
      const result = await inspectPackageArchive(buffer, {
        name: 'demo',
        version: '1.0.0',
      });
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.manifest.runtime).toBe('python');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

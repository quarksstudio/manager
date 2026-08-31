import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as tar from 'tar';

import Publish from './index';

describe('Publish action', () => {
  it('writes an uncertified snapshot and includes it in the artifact', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publish-action-'));
    const output = path.join(root, 'output');
    await fs.mkdir(path.join(root, 'src'));
    await fs.writeFile(path.join(root, 'src', 'agent.md'), '# demo');
    await fs.writeFile(
      path.join(root, 'skill.yml'),
      [
        'name: demo',
        'version: 1.0.0',
        'description: demo',
        'testCommand: node handler.js',
        'mapper_files:',
        '  ".":',
        '    agents:',
        '      agents/demo.md: src/agent.md',
        '',
      ].join('\n'),
    );
    const result = await Publish(root, { outputDir: output, upload: false });
    expect(result.verification.passed).toBe(true);
    const lock = await fs.readFile(path.join(root, 'skill.lock.yml'), 'utf8');
    expect(lock).toContain('isCertified: false');
    expect(lock).not.toContain('signature:');
    const entries: string[] = [];
    await tar.t({
      file: result.archive,
      onentry: (entry) => entries.push(entry.path),
    });
    expect(entries).toContain('skill.lock.yml');
  });
});

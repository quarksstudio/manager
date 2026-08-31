import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { readManifest } from './contracts';

describe('runtime-neutral manifests', () => {
  it.each([
    ['node', 'node dist/handler.js'],
    ['python', 'python -m skill_test_handler'],
  ])('accepts the %s runtime', async (runtime, testCommand) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-manifest-'));
    try {
      await fs.writeFile(path.join(root, 'skill.yml'), `name: demo\nversion: 1.0.0\ndescription: demo\nruntime: ${runtime}\ntestCommand: ${testCommand}\nmapper_files:\n  ".":\n    agents: {}\n`);
      await expect(readManifest(root)).resolves.toMatchObject({ runtime, testCommand });
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

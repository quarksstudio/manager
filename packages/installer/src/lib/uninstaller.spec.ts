import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { parseYaml, stringifyYaml } from '@quark/targz';

import type { SkillLockfile } from './recursive-installer';
import { PackageNotFound, uninstall } from './uninstaller';

describe('uninstall', () => {
  let target: string;

  beforeEach(async () => {
    target = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-uninstall-test-'));
  });

  afterEach(async () => {
    await fs.rm(target, { recursive: true, force: true });
  });

  it('removes mapped files, empty directories, metadata and lock entry', async () => {
    await prepareInstallation();
    const steps: string[] = [];

    await uninstall('demo@1.0.0', target, (step) => steps.push(step));

    await expect(
      fs.stat(path.join(target, 'agents', 'demo.md')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      fs.stat(path.join(target, 'openai', 'demo.md')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(target, 'agents'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    const lock = parseYaml<SkillLockfile>(
      await fs.readFile(path.join(target, 'skill.lock.yml'), 'utf8'),
    );
    expect(lock.dependencies).toEqual({});
    expect(lock.packages).toEqual({});
    expect(steps).toEqual([
      'locating',
      'reading-manifest',
      'removing-files',
      'cleaning',
      'completed',
    ]);
  });

  it('throws PackageNotFound when installation metadata is missing', async () => {
    await expect(uninstall('missing', target)).rejects.toBeInstanceOf(
      PackageNotFound,
    );
  });

  it('rejects mapped paths outside the installation directory', async () => {
    await prepareInstallation('../../outside.md');
    await expect(uninstall('demo', target)).rejects.toThrow(
      'Unsafe uninstall path',
    );
  });

  async function prepareInstallation(mappedTarget = 'agents/demo.md') {
    const locator = 'demo@1.0.0';
    const metadata = path.join(target, '.skills_metadata', 'demo_1.0.0');
    await fs.mkdir(metadata, { recursive: true });
    await fs.mkdir(path.join(target, 'agents'), { recursive: true });
    await fs.mkdir(path.join(target, 'openai'), { recursive: true });
    await fs.writeFile(path.join(target, 'agents', 'demo.md'), 'demo');
    await fs.writeFile(path.join(target, 'openai', 'demo.md'), 'openai');
    await fs.writeFile(
      path.join(metadata, 'skills.yml'),
      [
        'name: demo',
        'version: 1.0.0',
        'description: Demo',
        'files:',
        '  .:',
        '    agents:',
        `      ${mappedTarget}: source/demo.md`,
        '  openai:',
        '    agents:',
        '      openai/demo.md: source/openai.md',
        'dependencies: {}',
        '',
      ].join('\n'),
    );
    const lock: SkillLockfile = {
      lockfileVersion: 1,
      dependencies: { demo: locator },
      packages: {
        [locator]: {
          version: '1.0.0',
          resolved: 'https://registry/demo.tgz',
          integrity: 'sha256-test',
          isCertified: false,
          mappedFiles: [mappedTarget, 'openai/demo.md'],
        },
      },
    };
    await fs.writeFile(
      path.join(target, 'skill.lock.yml'),
      stringifyYaml(lock),
    );
  }
});

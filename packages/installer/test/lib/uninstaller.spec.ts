import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { parseYaml, stringifyYaml } from '@quarks.studio/targz';

import type { SkillLockfile } from '../../src/lib/recursive-installer';
import { PackageNotFound, uninstall } from '../../src/lib/uninstaller';

describe('uninstall', () => {
  let target: string;

  beforeEach(async () => {
    target = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-uninstall-test-'));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(target, { recursive: true, force: true });
    await fs.rm(`${target}-outside`, { recursive: true, force: true });
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

  it.each(['agents', '.skills_metadata', '.skills_metadata/demo_1.0.0'])(
    'rejects a symlinked %s without moving external files',
    async (relative) => {
      await prepareInstallation();
      const originalLock = await fs.readFile(
        path.join(target, 'skill.lock.yml'),
        'utf8',
      );
      const external = `${target}-outside`;
      await fs.rename(path.join(target, relative), external);
      await fs.symlink(external, path.join(target, relative));
      const rename = jest.spyOn(fs, 'rename');
      await expect(uninstall('demo', target)).rejects.toThrow();
      expect(rename).not.toHaveBeenCalled();
      expect(
        await fs.readFile(path.join(target, 'skill.lock.yml'), 'utf8'),
      ).toBe(originalLock);
      expect(await fs.readdir(external)).not.toHaveLength(0);
    },
  );

  it.each([
    'skill.lock.yml',
    'agents/demo.md',
    '.skills_metadata/demo_1.0.0/skills.yml',
  ])('rejects a symlinked file %s', async (relative) => {
    await prepareInstallation();
    const external = `${target}-outside`;
    await fs.rename(path.join(target, relative), external);
    const original = await fs.readFile(external, 'utf8');
    await fs.symlink(external, path.join(target, relative));
    const rename = jest.spyOn(fs, 'rename');
    await expect(uninstall('demo', target)).rejects.toThrow();
    expect(rename).not.toHaveBeenCalled();
    expect(await fs.readFile(external, 'utf8')).toBe(original);
  });

  it('restores files and lock after a failure during cleaning', async () => {
    await prepareInstallation();
    const original = await fs.readFile(
      path.join(target, 'skill.lock.yml'),
      'utf8',
    );
    await expect(
      uninstall('demo', target, (step) => {
        if (step === 'cleaning') throw new Error('Synthetic failure');
      }),
    ).rejects.toThrow('Synthetic failure');
    expect(await fs.readFile(path.join(target, 'agents/demo.md'), 'utf8')).toBe(
      'demo',
    );
    expect(await fs.readFile(path.join(target, 'openai/demo.md'), 'utf8')).toBe(
      'openai',
    );
    expect(await fs.readFile(path.join(target, 'skill.lock.yml'), 'utf8')).toBe(
      original,
    );
    expect(
      (await fs.readdir(target)).some((name) =>
        name.startsWith('.quark-transaction-'),
      ),
    ).toBe(false);
  });

  it('rejects a parent swapped to an external symlink after preflight', async () => {
    await prepareInstallation();
    const external = `${target}-outside`;
    await fs.mkdir(external);
    await fs.writeFile(path.join(external, 'demo.md'), 'KEEP');
    await expect(
      uninstall('demo', target, (step) => {
        if (step === 'removing-files') {
          require('node:fs').renameSync(
            path.join(target, 'agents'),
            path.join(target, 'original-agents'),
          );
          require('node:fs').symlinkSync(external, path.join(target, 'agents'));
        }
      }),
    ).rejects.toThrow('Unsafe installation directory');
    expect(await fs.readFile(path.join(external, 'demo.md'), 'utf8')).toBe(
      'KEEP',
    );
    expect(
      await fs.readFile(path.join(target, 'original-agents/demo.md'), 'utf8'),
    ).toBe('demo');
  });

  it('keeps external files intact when a parent is swapped after opening its descriptor', async () => {
    await prepareInstallation();
    const external = `${target}-outside`;
    await fs.mkdir(external);
    await fs.writeFile(path.join(external, 'demo.md'), 'KEEP');
    const originalRename = fs.rename.bind(fs);
    let swapped = false;
    jest.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
      if (
        !swapped &&
        path.basename(String(source)) === 'demo.md' &&
        (await fs.realpath(path.dirname(String(source)))) ===
          path.join(target, 'agents')
      ) {
        swapped = true;
        await originalRename(
          path.join(target, 'agents'),
          path.join(target, 'original-agents'),
        );
        await fs.symlink(external, path.join(target, 'agents'));
      }
      return originalRename(source, destination);
    });
    await expect(uninstall('demo', target)).rejects.toThrow('backups retained');
    expect(swapped).toBe(true);
    expect(await fs.readFile(path.join(external, 'demo.md'), 'utf8')).toBe(
      'KEEP',
    );
    const backup = (await fs.readdir(target)).find((name) =>
      name.startsWith('.quark-transaction-'),
    );
    expect(backup).toBeDefined();
    expect(
      await fs.readFile(
        path.join(target, backup!, 'backup/agents/demo.md'),
        'utf8',
      ),
    ).toBe('demo');
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

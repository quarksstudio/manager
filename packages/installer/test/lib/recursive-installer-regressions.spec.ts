import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as tar from 'tar';
import { stringifyYaml as stringify } from '@quarks.studio/targz';
import { install } from '../../src/lib/recursive-installer';
import { apiFetch, apiRequest } from '@quarks.studio/config/http';

jest.mock('@quarks.studio/config', () => ({
  loadConfig: async () => ({
    config: { registryUrl: 'https://registry.example.test/v1' },
  }),
}));
jest.mock('@quarks.studio/config/http', () => ({
  apiFetch: jest.fn(),
  apiRequest: jest.fn(),
}));
jest.mock('@quarks.studio/storage/installations', () => ({
  readCachedSkill: async () => undefined,
  cacheSkill: async () => undefined,
}));
jest.mock('@quarks.studio/tester', () => ({
  ...jest.requireActual('../../../tester/src/lib/tiers/tier1'),
  readManifest: jest.requireActual('../../../tester/src/lib/contracts')
    .readManifest,
}));

describe('recursive installer', () => {
  let root: string;
  let target: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-audit-install-'));
    target = path.join(root, 'project');
    await fs.mkdir(target);
    jest.clearAllMocks();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  async function registry(versions = ['1.0.0']) {
    const bundles = new Map<string, { buffer: Buffer; hash: string }>();
    for (const version of versions) {
      const source = path.join(root, version);
      await fs.mkdir(source);
      await fs.writeFile(
        path.join(source, 'fixture.md'),
        'NEW_SYNTHETIC_CONTENT',
      );
      await fs.writeFile(
        path.join(source, 'skills.yml'),
        stringify({
          name: 'audit',
          version,
          description: 'audit',
          dependencies: {},
          files: { '.': { agents: { 'agents/fixture.md': 'fixture.md' } } },
        }),
      );
      const filename = path.join(root, `${version}.tgz`);
      await tar.c({ cwd: source, file: filename, gzip: true }, [
        'skills.yml',
        'fixture.md',
      ]);
      const buffer = await fs.readFile(filename);
      bundles.set(version, {
        buffer,
        hash: createHash('sha256').update(buffer).digest('hex'),
      });
    }
    jest.mocked(apiFetch).mockImplementation(async (url: string) => {
      const tail = decodeURIComponent(new URL(url).pathname.split('/').at(-1)!);
      return tail === 'audit'
        ? { versions }
        : { version: tail, hash: bundles.get(tail)!.hash };
    });
    jest.mocked(apiRequest).mockImplementation(async (url: string) => {
      const version = decodeURIComponent(
        new URL(url).pathname.split('/').at(-2)!,
      );
      return new Response(new Uint8Array(bundles.get(version)!.buffer));
    });
  }

  it('M08: rollback restores the destination if replacing the staged file fails', async () => {
    await registry();
    await fs.mkdir(path.join(target, 'agents'));
    const destination = path.join(target, 'agents/fixture.md');
    await fs.writeFile(destination, 'KEEP_SYNTHETIC_CONTENT');
    const rename = fs.rename.bind(fs);
    jest.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (
        (await fs.realpath(path.dirname(String(from)))).includes('/files/') &&
        path.basename(String(to)) === path.basename(destination) &&
        (await fs.realpath(path.dirname(String(to)))) ===
          path.dirname(destination)
      ) {
        throw Object.assign(new Error('Synthetic destination failure'), {
          code: 'EIO',
        });
      }
      return rename(from, to);
    });
    await expect(
      install('audit@1.0.0', { targetInstallDir: target, force: true }),
    ).rejects.toThrow('Synthetic destination failure');
    const content = await fs.readFile(destination, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return 'REMOVED';
      throw error;
    });
    expect(content).toBe('KEEP_SYNTHETIC_CONTENT');
  });

  it('M09: a stable exact selector does not resolve a prerelease', async () => {
    await registry(['1.0.0', '1.0.0-beta']);
    const result = await install('audit@1.0.0', {
      targetInstallDir: target,
      force: true,
    });
    expect(result.rootLocators).toEqual(['audit@1.0.0']);
  });

  it('M10: caret ^0.0.1 does not upgrade to 0.0.2', async () => {
    await registry(['0.0.1', '0.0.2']);
    const result = await install('audit@^0.0.1', {
      targetInstallDir: target,
      force: true,
    });
    expect(result.rootLocators).toEqual(['audit@0.0.1']);
  });
  it.each([
    ['*', ['1.0.0', '2.0.0-beta'], '1.0.0'],
    ['latest', ['1.0.0', '2.0.0-beta'], '1.0.0'],
    [
      '1.0.0-beta.2',
      ['1.0.0-beta.2', '1.0.0-beta.10', '1.0.0'],
      '1.0.0-beta.2',
    ],
    ['^1.0.0-beta.2', ['1.0.0-beta.2', '1.0.0-beta.10'], '1.0.0-beta.10'],
    ['^0.2.1', ['0.2.1', '0.2.9', '0.3.0'], '0.2.9'],
    ['~1.2', ['1.2.0', '1.2.9', '1.3.0'], '1.2.9'],
    ['1.x', ['1.0.0', '1.9.0', '2.0.0'], '1.9.0'],
    [
      '>=1.0.0 <2.0.0 || >=3.0.0 <4.0.0',
      ['1.1.0', '2.0.0', '3.1.0', '4.0.0'],
      '3.1.0',
    ],
    ['1.0.0 - 1.2.0', ['1.0.0', '1.2.0', '1.2.1'], '1.2.0'],
    ['1.0.0+first', ['1.0.0+first', '1.0.0+second'], '1.0.0+first'],
    ['1.0.0', ['1.0.0', 'invalid-version', '1.0.0-beta'], '1.0.0'],
  ])(
    'M09/M10: resolves %s using standard SemVer rules',
    async (range, versions, expected) => {
      await registry(versions as string[]);
      const result = await install(`audit@${range}`, {
        targetInstallDir: target,
        force: true,
      });
      expect(result.rootLocators).toEqual([`audit@${expected}`]);
    },
  );

  it('M09/M10: rejects an invalid range without downloading', async () => {
    await registry();
    await expect(
      install('audit@not-a-range', { targetInstallDir: target, force: true }),
    ).rejects.toThrow('Invalid version range');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it.each(['backup', 'replacement', 'lock-backup', 'lock-replacement'])(
    'M08: restores files and the previous lock after failure at %s',
    async (phase) => {
      await registry();
      await install('audit@1.0.0', { targetInstallDir: target, force: true });
      const lockPath = path.join(target, 'skill.lock.yml');
      const lock = await fs.readFile(lockPath, 'utf8');
      const destination = path.join(target, 'agents/fixture.md');
      await fs.writeFile(destination, 'KEEP');
      const originalRename = fs.rename.bind(fs);
      let injected = false;
      jest.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
        const source = String(from),
          destinationPath = String(to);
        const parent = await fs.realpath(path.dirname(source));
        const match =
          phase === 'backup'
            ? path.basename(source) === 'fixture.md' &&
              parent === path.join(target, 'agents')
            : phase === 'replacement'
              ? path.basename(source) === 'fixture.md' &&
                parent.includes('/files/')
              : phase === 'lock-backup'
                ? path.basename(source) === 'skill.lock.yml' &&
                  parent === target
                : path.basename(source) === 'new-lock.yml';
        if (!injected && match) {
          injected = true;
          throw new Error(`Synthetic ${phase} failure`);
        }
        await originalRename(source, destinationPath);
      });
      await expect(
        install('audit@1.0.0', { targetInstallDir: target, force: true }),
      ).rejects.toThrow(`Synthetic ${phase} failure`);
      expect(injected).toBe(true);
      expect(await fs.readFile(destination, 'utf8')).toBe('KEEP');
      expect(await fs.readFile(lockPath, 'utf8')).toBe(lock);
      expect(
        (await fs.readdir(target)).filter((name) =>
          name.startsWith('.quark-transaction-'),
        ),
      ).toEqual([]);
    },
  );

  it('M08: keeps a backup if restoring the original file also fails', async () => {
    await registry();
    await fs.mkdir(path.join(target, 'agents'));
    await fs.writeFile(path.join(target, 'agents/fixture.md'), 'KEEP');
    const originalRename = fs.rename.bind(fs);
    jest.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      const parent = await fs.realpath(path.dirname(String(from)));
      if (
        path.basename(String(from)) === 'fixture.md' &&
        (parent.includes('/files/') || parent.includes('/backups/'))
      )
        throw new Error('Synthetic storage failure');
      return originalRename(from, to);
    });
    await expect(
      install('audit@1.0.0', { targetInstallDir: target, force: true }),
    ).rejects.toThrow('backups retained');
    const transaction = (await fs.readdir(target)).find((name) =>
      name.startsWith('.quark-transaction-'),
    );
    expect(transaction).toBeDefined();
    expect(
      await fs.readFile(
        path.join(target, transaction!, 'backups/agents/fixture.md'),
        'utf8',
      ),
    ).toBe('KEEP');
  });
});

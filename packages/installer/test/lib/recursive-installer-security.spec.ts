import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
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

/** Real archives/filesystem; all registry requests and cache adapters are local doubles. */
describe('M07 descriptor-anchored installation', () => {
  let root: string;
  let target: string;
  let outside: string;
  const run = () =>
    install('audit@1.0.0', { targetInstallDir: target, force: true });
  beforeEach(async () => {
    jest.clearAllMocks();
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-install-security-'));
    target = path.join(root, 'project');
    outside = path.join(root, 'outside');
    await fs.mkdir(target);
    await fs.mkdir(outside);
    await fs.writeFile(
      path.join(outside, 'fixture.md'),
      'KEEP_SYNTHETIC_CONTENT',
    );
    const source = path.join(root, 'source');
    await fs.mkdir(source);
    await fs.writeFile(
      path.join(source, 'fixture.md'),
      'NEW_SYNTHETIC_CONTENT',
    );
    await fs.writeFile(
      path.join(source, 'skills.yml'),
      stringify({
        name: 'audit',
        version: '1.0.0',
        description: 'audit',
        dependencies: {},
        files: { '.': { agents: { 'agents/fixture.md': 'fixture.md' } } },
      }),
    );
    const archive = path.join(root, 'fixture.tgz');
    await tar.c({ cwd: source, file: archive, gzip: true }, [
      'skills.yml',
      'fixture.md',
    ]);
    const buffer = await fs.readFile(archive);
    const hash = createHash('sha256').update(buffer).digest('hex');
    jest
      .mocked(apiFetch)
      .mockImplementation((async (url: string) =>
        new URL(url).pathname.endsWith('/audit')
          ? { versions: ['1.0.0'] }
          : { version: '1.0.0', hash }) as typeof apiFetch);
    jest
      .mocked(apiRequest)
      .mockResolvedValue(new Response(new Uint8Array(buffer)));
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });
  const intact = async () =>
    expect(await fs.readFile(path.join(outside, 'fixture.md'), 'utf8')).toBe(
      'KEEP_SYNTHETIC_CONTENT',
    );
  const noTransaction = async () =>
    expect(
      (await fs.readdir(target)).filter((name) =>
        name.startsWith('.quark-transaction-'),
      ),
    ).toEqual([]);
  it('rejects a linked destination directory before moving or staging project files', async () => {
    await fs.symlink(outside, path.join(target, 'agents'));
    const rename = jest.spyOn(fs, 'rename');
    await expect(run()).rejects.toThrow('Unsafe installation directory');
    expect(
      rename.mock.calls.filter(([from, to]) =>
        [from, to].some(
          (value) =>
            String(value).startsWith('/proc/self/fd/') ||
            String(value).startsWith(`${target}/`),
        ),
      ),
    ).toEqual([]);
    await intact();
    await noTransaction();
  });
  it('rejects a dangling destination symlink', async () => {
    await fs.symlink(path.join(root, 'missing'), path.join(target, 'agents'));
    await expect(run()).rejects.toThrow('Unsafe installation directory');
    await noTransaction();
    await intact();
  });
  it('rejects even a directory link pointing inside the project', async () => {
    await fs.mkdir(path.join(target, 'legitimate'));
    await fs.symlink('legitimate', path.join(target, 'agents'));
    await expect(run()).rejects.toThrow('Unsafe installation directory');
    await expect(
      fs.stat(path.join(target, 'legitimate/fixture.md')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('rejects a linked final file without touching the outside target', async () => {
    await fs.mkdir(path.join(target, 'agents'));
    await fs.symlink(
      path.join(outside, 'fixture.md'),
      path.join(target, 'agents/fixture.md'),
    );
    await expect(run()).rejects.toThrow('Unsafe installation destination');
    await intact();
    await noTransaction();
  });
  it.each(['.skills_metadata', '.skills_metadata/audit_1.0.0'])(
    'rejects linked metadata directories (%s) before committing a legitimate mapped file',
    async (link) => {
      await fs.mkdir(path.dirname(path.join(target, link)), {
        recursive: true,
      });
      await fs.symlink(outside, path.join(target, link));
      await expect(run()).rejects.toThrow('Unsafe installation directory');
      await expect(fs.stat(path.join(target, 'agents'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
      await noTransaction();
      await intact();
    },
  );
  it('rejects a linked lockfile before changing mapped files', async () => {
    await fs.writeFile(path.join(outside, 'skill.lock.yml'), '');
    await fs.symlink(
      path.join(outside, 'skill.lock.yml'),
      path.join(target, 'skill.lock.yml'),
    );
    await expect(run()).rejects.toThrow('Unsafe installation destination');
    expect(
      await fs.readFile(path.join(outside, 'skill.lock.yml'), 'utf8'),
    ).toBe('');
    await expect(fs.stat(path.join(target, 'agents'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await noTransaction();
  });
  it('installs and replaces legitimate files without leaking transaction directories', async () => {
    await fs.mkdir(path.join(target, 'agents'));
    await fs.writeFile(path.join(target, 'agents/fixture.md'), 'old');
    const result = await run();
    expect(result.rootLocators).toEqual(['audit@1.0.0']);
    expect(
      await fs.readFile(path.join(target, 'agents/fixture.md'), 'utf8'),
    ).toBe('NEW_SYNTHETIC_CONTENT');
    expect(
      await fs.readFile(path.join(target, 'skill.lock.yml'), 'utf8'),
    ).toContain('audit@1.0.0');
    await noTransaction();
    await intact();
  });
  it.each(['darwin', 'win32'] as const)(
    'rejects unsupported platform %s before registry access',
    async (platform) => {
      const original = Object.getOwnPropertyDescriptor(process, 'platform')!;
      Object.defineProperty(process, 'platform', {
        ...original,
        value: platform,
      });
      try {
        await expect(run()).rejects.toThrow(
          'Secure installation requires Linux directory descriptors',
        );
        expect(apiRequest).not.toHaveBeenCalled();
        expect(apiFetch).not.toHaveBeenCalled();
        await intact();
        await noTransaction();
      } finally {
        Object.defineProperty(process, 'platform', original);
      }
    },
  );
  it('does not follow a symlink introduced immediately before opening a destination parent', async () => {
    await fs.mkdir(path.join(target, 'agents'));
    const open = fs.open.bind(fs);
    let swapped = false;
    jest
      .spyOn(fs, 'open')
      .mockImplementation(async (...args: Parameters<typeof fs.open>) => {
        const name = String(args[0]);
        if (
          !swapped &&
          name.startsWith('/proc/self/fd/') &&
          path.basename(name) === 'agents' &&
          (await fs.realpath(path.dirname(name))) === target
        ) {
          swapped = true;
          await fs.rename(
            path.join(target, 'agents'),
            path.join(target, 'parked'),
          );
          await fs.symlink(outside, path.join(target, 'agents'));
        }
        return open(...args);
      });
    await expect(run()).rejects.toThrow('Unsafe installation directory');
    expect(swapped).toBe(true);
    await intact();
    await noTransaction();
  });
  it('keeps a rename anchored when a parent is swapped after it was opened', async () => {
    await fs.mkdir(path.join(target, 'agents'));
    await fs.writeFile(path.join(target, 'agents/fixture.md'), 'old');
    const rename = fs.rename.bind(fs);
    let swapped = false;
    jest.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (
        !swapped &&
        path.basename(String(to)) === 'fixture.md' &&
        (await fs.realpath(path.dirname(String(from)))).includes('/files/')
      ) {
        swapped = true;
        await rename(path.join(target, 'agents'), path.join(target, 'parked'));
        await fs.symlink(outside, path.join(target, 'agents'));
      }
      return rename(from, to);
    });
    await expect(run()).rejects.toThrow('Unsafe installation directory');
    expect(swapped).toBe(true);
    await intact();
    const transaction = (await fs.readdir(target)).find((name) =>
      name.startsWith('.quark-transaction-'),
    );
    expect(transaction).toBeDefined();
    expect(
      await fs.readFile(
        path.join(target, transaction!, 'backups/agents/fixture.md'),
        'utf8',
      ),
    ).toBe('old');
  });
});

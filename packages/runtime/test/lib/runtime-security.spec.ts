import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { executeSkill } from '../../src/lib/runtime';

/** Real filesystem fixture, actual local adapter, no external networks or data. */
it('M01: rejects a filesystem-restricted skill before it can copy a file outside its root', async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'quark-runtime-regression-'),
  );
  try {
    const skill = path.join(root, 'skill');
    await fs.mkdir(skill);
    const secret = path.join(root, 'synthetic-secret.txt');
    const result = path.join(skill, 'result.txt');
    await fs.writeFile(secret, 'AUDIT_SYNTHETIC_SECRET');
    await fs.writeFile(
      path.join(skill, 'run.cjs'),
      `const fs = require('node:fs'); fs.writeFileSync(process.argv[3], fs.readFileSync(process.argv[2], 'utf8'));`,
    );
    expect(() =>
      executeSkill(
        {
          name: 'audit',
          version: '1.0.0',
          entrypoint: 'run.cjs',
          runtime: { node: '>=20' },
          permissions: { filesystem: false },
        },
        skill,
        [secret, result],
        {},
        { allowFilesystem: false, allowedDomains: [], allowedTools: [] },
      ),
    ).toThrow('Restricted execution requires a permission-enforcing host');
    await expect(fs.stat(result)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(secret, 'utf8')).toBe('AUDIT_SYNTHETIC_SECRET');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

describe('M02: runtime rejects external entrypoints before execution', () => {
  let root: string;
  let skill: string;
  const manifest = {
    name: 'fixture',
    version: '1.0.0',
    entrypoint: 'run.cjs',
    runtime: { node: '>=20' },
    permissions: { filesystem: true, network: ['*'], tools: ['*'] },
  };
  const policy = {
    allowFilesystem: true,
    allowedDomains: ['*'],
    allowedTools: ['*'],
  };
  beforeEach(async () => {
    root = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), 'quark-runtime-m02-')),
    );
    skill = path.join(root, 'skill');
    await fs.mkdir(skill);
    await fs.writeFile(path.join(root, 'outside.cjs'), '// external fixture');
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });
  it.each(['file', 'parent'])(
    'rejects an external %s symlink without spawning or invoking a host',
    async (kind) => {
      const processModule =
        require('child_process') as typeof import('child_process');
      const spawn = jest.spyOn(processModule, 'spawn');
      const host = { run: jest.fn() };
      let entrypoint = 'run.cjs';
      if (kind === 'file')
        await fs.symlink('../outside.cjs', path.join(skill, entrypoint));
      else {
        await fs.symlink(root, path.join(skill, 'src'));
        entrypoint = 'src/outside.cjs';
      }
      for (const runner of [undefined, host]) {
        expect(() =>
          executeSkill(
            { ...manifest, entrypoint },
            skill,
            [],
            {},
            policy,
            runner,
          ),
        ).toThrow('physical skill directory');
      }
      expect(spawn).not.toHaveBeenCalled();
      expect(host.run).not.toHaveBeenCalled();
    },
  );
  it('rejects internal symlinks in immutable restricted execution snapshots', async () => {
    await fs.writeFile(path.join(skill, 'internal.cjs'), '// internal fixture');
    await fs.symlink('internal.cjs', path.join(skill, 'run.cjs'));
    const host = { run: jest.fn() };
    expect(() =>
      executeSkill(
        { ...manifest, permissions: { filesystem: false } },
        skill,
        [],
        {},
        { allowedDomains: [], allowedTools: [] },
        host,
      ),
    ).toThrow();
    expect(host.run).not.toHaveBeenCalled();
  });
});

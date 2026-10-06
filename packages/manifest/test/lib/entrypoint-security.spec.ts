import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveEntrypoint, type Manifest } from '../../src/lib/manifest';

describe('M02: physical entrypoint boundary', () => {
  let root: string;
  let skill: string;
  const manifest: Manifest = {
    name: 'fixture',
    version: '1.0.0',
    entrypoint: 'run.cjs',
    permissions: { filesystem: false },
  };
  const resolve = (entrypoint = 'run.cjs', directory = skill) =>
    resolveEntrypoint({ ...manifest, entrypoint }, directory);
  beforeEach(async () => {
    root = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), 'quark-entrypoint-')),
    );
    skill = path.join(root, 'skill');
    await fs.mkdir(skill);
    await fs.writeFile(path.join(skill, 'run.cjs'), '// internal fixture');
    await fs.writeFile(path.join(root, 'outside.cjs'), '// external fixture');
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('resolves an ordinary internal file', () => {
    expect(resolve()).toBe(path.join(skill, 'run.cjs'));
  });
  it('rejects an external file symlink (original audit reproduction)', async () => {
    await fs.unlink(path.join(skill, 'run.cjs'));
    await fs.symlink('../outside.cjs', path.join(skill, 'run.cjs'));
    expect(() => resolve()).toThrow('physical skill directory');
  });
  it('rejects a parent directory symlink pointing outside', async () => {
    await fs.symlink(root, path.join(skill, 'src'));
    expect(() => resolve('src/outside.cjs')).toThrow(
      'physical skill directory',
    );
  });
  it('rejects a chain of symlinks ending outside', async () => {
    await fs.symlink('../outside.cjs', path.join(skill, 'intermediate'));
    await fs.symlink('intermediate', path.join(skill, 'linked.cjs'));
    expect(() => resolve('linked.cjs')).toThrow('physical skill directory');
  });
  it('rejects a sibling sharing the root name prefix', async () => {
    await fs.mkdir(`${skill}-other`);
    await fs.writeFile(path.join(`${skill}-other`, 'run.cjs'), '// fixture');
    await fs.symlink(`${skill}-other`, path.join(skill, 'src'));
    expect(() => resolve('src/run.cjs')).toThrow('physical skill directory');
  });
  it('returns the canonical file for an internal symlink', async () => {
    await fs.symlink('run.cjs', path.join(skill, 'alias.cjs'));
    expect(resolve('alias.cjs')).toBe(path.join(skill, 'run.cjs'));
  });
  it('canonicalizes the caller-selected skill root', async () => {
    const alias = path.join(root, 'root-alias');
    await fs.symlink(skill, alias);
    expect(resolve('run.cjs', alias)).toBe(path.join(skill, 'run.cjs'));
  });
  it.each(['../outside.cjs', '.', '../skill-other/run.cjs'])(
    'rejects lexical escape or root %s',
    (entrypoint) => {
      expect(() => resolve(entrypoint)).toThrow('inside the skill directory');
    },
  );
  it('rejects a directory entrypoint', async () => {
    await fs.mkdir(path.join(skill, 'directory'));
    expect(() => resolve('directory')).toThrow('regular file');
  });
  it('rejects a dangling symlink', async () => {
    await fs.symlink('missing.cjs', path.join(skill, 'dangling.cjs'));
    expect(() => resolve('dangling.cjs')).toThrow();
  });
  it('rejects a symlink loop', async () => {
    await fs.symlink('loop.cjs', path.join(skill, 'loop.cjs'));
    expect(() => resolve('loop.cjs')).toThrow();
  });
});

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import * as path from 'path';

import { Client } from '@quark/registry';
import { pack, parseYaml } from '@quark/targz';

import { install, type SkillLockfile } from './recursive-installer';

describe('recursive installer', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), 'recursive-installer-'),
    );
    jest.spyOn(os, 'homedir').mockReturnValue(workspace);
    Client.API = 'https://registry.test/v1';
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(workspace, { recursive: true, force: true });
  });

  it('migrates the actions line-based lockfile while keeping pinned versions', async () => {
    const archives = new Map<string, { buffer: Buffer; hash: string }>();
    archives.set('legacy@1.0.0', await archive('legacy', '1.0.0'));
    mockRegistry(archives, { legacy: ['1.0.0', '2.0.0'] });
    const target = path.join(workspace, 'target');
    await fs.mkdir(target);
    await fs.writeFile(path.join(target, 'skill.lock.yml'), 'legacy@1.0.0\n');
    const result = await install(undefined, {
      targetInstallDir: target,
      cacheDir: path.join(workspace, 'cache'),
    });
    const lock = parseYaml<SkillLockfile>(
      await fs.readFile(result.lockfilePath, 'utf8'),
    );
    expect(lock.dependencies).toEqual({ legacy: 'legacy@1.0.0' });
    expect(lock.packages['legacy@1.0.0'].integrity).toMatch(/^sha256-/);
  });

  it('adds multiple roots together and preserves previously installed roots', async () => {
    const archives = new Map<string, { buffer: Buffer; hash: string }>();
    for (const name of ['first', 'second', 'third'])
      archives.set(`${name}@1.0.0`, await archive(name, '1.0.0'));
    mockRegistry(archives, {
      first: ['1.0.0'],
      second: ['1.0.0'],
      third: ['1.0.0'],
    });
    const options = {
      targetInstallDir: path.join(workspace, 'target'),
      cacheDir: path.join(workspace, 'cache'),
      force: true,
    };
    await install(['first@1.0.0', 'second@1.0.0'], options);
    const result = await install('third@1.0.0', options);
    const lock = parseYaml<SkillLockfile>(
      await fs.readFile(result.lockfilePath, 'utf8'),
    );
    expect(Object.keys(lock.dependencies).sort()).toEqual([
      'first',
      'second',
      'third',
    ]);
    const restored = await install(undefined, options);
    expect(restored.rootLocators.sort()).toEqual([
      'first@1.0.0',
      'second@1.0.0',
      'third@1.0.0',
    ]);
  });

  it('installs dependencies recursively and writes an exact lockfile', async () => {
    const archives = new Map<string, { buffer: Buffer; hash: string }>();
    archives.set(
      'root@1.1.0',
      await archive('root', '1.1.0', { child: '^2.0.0' }),
    );
    archives.set('child@2.3.0', await archive('child', '2.3.0'));
    mockRegistry(archives, { root: ['1.0.0', '1.1.0'], child: ['2.3.0'] });

    const target = path.join(workspace, 'target');
    const result = await install('root@^1.0.0', {
      targetInstallDir: target,
      force: true,
      cacheDir: path.join(workspace, 'cache'),
    });

    expect(
      await fs.readFile(path.join(target, 'agents', 'root.md'), 'utf8'),
    ).toBe('root');
    expect(
      await fs.readFile(path.join(target, 'agents', 'child.md'), 'utf8'),
    ).toBe('child');
    const lock = parseYaml<SkillLockfile>(
      await fs.readFile(result.lockfilePath, 'utf8'),
    );
    expect(lock.dependencies).toEqual({
      child: 'child@2.3.0',
      root: 'root@1.1.0',
    });
    expect(lock.packages['root@1.1.0']).toMatchObject({
      version: '1.1.0',
      isCertified: true,
      dependencies: { child: '^2.0.0' },
    });
    expect(lock.packages['child@2.3.0'].integrity).toMatch(/^sha256-/);
  });

  it('isolates an incompatible transitive version', async () => {
    const archives = new Map<string, { buffer: Buffer; hash: string }>();
    archives.set(
      'first@1.0.0',
      await archive('first', '1.0.0', { shared: '^1.0.0' }),
    );
    archives.set(
      'second@1.0.0',
      await archive('second', '1.0.0', { shared: '^2.0.0' }),
    );
    archives.set('shared@1.5.0', await archive('shared', '1.5.0'));
    archives.set('shared@2.1.0', await archive('shared', '2.1.0'));
    mockRegistry(archives, {
      first: ['1.0.0'],
      second: ['1.0.0'],
      shared: ['1.5.0', '2.1.0'],
    });
    const target = path.join(workspace, 'target');
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(
      path.join(target, 'skills.yml'),
      [
        'name: project',
        'version: 1.0.0',
        'description: project',
        'files:',
        '  .:',
        '    agents: {}',
        'dependencies:',
        '  first: 1.0.0',
        '  second: 1.0.0',
        '',
      ].join('\n'),
    );

    const result = await install(undefined, {
      targetInstallDir: target,
      force: true,
      cacheDir: path.join(workspace, 'cache'),
    });
    expect(result.isolatedLocators).toContain('second@1.0.0>shared@2.1.0');
    expect(result.rootLocators).toContain('shared@1.5.0');
    expect(await fs.readdir(path.join(target, '.skills_nested'))).toHaveLength(
      1,
    );
  });

  it('reuses cached root and dependency bundles in another target', async () => {
    const archives = new Map<string, { buffer: Buffer; hash: string }>();
    archives.set(
      'root@1.0.0',
      await archive('root', '1.0.0', { child: '1.0.0' }),
    );
    archives.set('child@1.0.0', await archive('child', '1.0.0'));
    const fetchMock = mockRegistry(archives, {
      root: ['1.0.0'],
      child: ['1.0.0'],
    });
    const cacheDir = path.join(workspace, 'cache');

    await install('root@1.0.0', {
      targetInstallDir: path.join(workspace, 'one'),
      cacheDir,
    });
    await install('root@1.0.0', {
      targetInstallDir: path.join(workspace, 'two'),
      cacheDir,
    });

    const bundleRequests = fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith('/bundle'),
    );
    expect(bundleRequests).toHaveLength(2);
  });

  async function archive(
    name: string,
    version: string,
    dependencies: Record<string, string> = {},
  ) {
    const source = path.join(workspace, `${name}-${version}`);
    await fs.mkdir(path.join(source, 'source'), { recursive: true });
    await fs.writeFile(path.join(source, 'source', `${name}.md`), name);
    const dependencyLines = Object.entries(dependencies).map(
      ([key, value]) => `  ${key}: ${value}`,
    );
    await fs.writeFile(
      path.join(source, 'skills.yml'),
      [
        `name: ${name}`,
        `version: ${version}`,
        `description: ${name}`,
        'files:',
        '  .:',
        '    agents:',
        `      agents/${name}.md: source/${name}.md`,
        'dependencies:',
        ...dependencyLines,
        '',
      ].join('\n'),
    );
    const archivePath = await pack(source, workspace);
    const buffer = await fs.readFile(archivePath);
    return { buffer, hash: createHash('sha256').update(buffer).digest('hex') };
  }

  function mockRegistry(
    archives: Map<string, { buffer: Buffer; hash: string }>,
    versions: Record<string, string[]>,
  ) {
    return jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      const parts = url.pathname
        .split('/')
        .filter(Boolean)
        .slice(2)
        .map(decodeURIComponent);
      const [name, version, suffix] = parts;
      if (!version)
        return Response.json({
          versions: versions[name].map((item) => ({ version: item })),
        });
      const archive = archives.get(`${name}@${version}`);
      if (!archive) return new Response('missing', { status: 404 });
      if (suffix === 'bundle')
        return new Response(new Uint8Array(archive.buffer));
      return Response.json({ version, hash: archive.hash, isCertified: true });
    });
  }
});

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as tar from 'tar';
import { createHash } from 'crypto';
import { Client } from '@quark/registry';
import { installSkill } from './installer';

describe('installer', () => {
  const tmpDir = path.join(os.tmpdir(), 'quark-installer-test-' + Date.now());

  beforeEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpDir, { recursive: true });
    Client.API = 'http://localhost:3000/v1';
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('downloads, verifies and installs a canonical package', async () => {
    const testPkgDir = path.join(tmpDir, 'source-package');
    fs.mkdirSync(path.join(testPkgDir, 'package'), { recursive: true });
    fs.writeFileSync(
      path.join(testPkgDir, 'package', 'skill.json'),
      JSON.stringify({
        name: '@foo/bar',
        version: '1.0.0',
        entrypoint: './src/index.py',
        runtime: { python: '>=3.12' },
      }),
    );
    fs.mkdirSync(path.join(testPkgDir, 'package', 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(testPkgDir, 'package', 'src', 'index.py'),
      'print("test")',
    );

    const testTarball = path.join(tmpDir, 'test.tgz');
    await tar.c(
      {
        gzip: true,
        file: testTarball,
        cwd: testPkgDir,
      },
      ['package'],
    );
    const tarballBuffer = fs.readFileSync(testTarball);

    const hash = createHash('sha256').update(tarballBuffer).digest('hex');

    const globalFetch = jest.spyOn(global, 'fetch') as jest.Mock;
    globalFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '1.0.0',
          hash,
          manifest: {
            name: '@foo/bar',
            version: '1.0.0',
            entrypoint: './src/index.py',
            runtime: { python: '>=3.12' },
          },
        }),
        status: 200,
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () =>
          tarballBuffer.buffer.slice(
            tarballBuffer.byteOffset,
            tarballBuffer.byteOffset + tarballBuffer.byteLength,
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '1.0.0',
          hash,
          manifest: {
            name: '@foo/bar',
            version: '1.0.0',
            entrypoint: './src/index.py',
            runtime: { python: '>=3.12' },
          },
        }),
        status: 200,
      });

    const installCwd = path.join(tmpDir, 'install-cwd');
    await installSkill('@foo/bar', '1.0.0', false, installCwd, {
      cacheDir: path.join(tmpDir, 'cache'),
    });

    const installedPath = path.join(
      installCwd,
      '.quark',
      'skills',
      'foo',
      'bar',
      '1.0.0',
    );
    expect(fs.existsSync(path.join(installedPath, 'skill.json'))).toBe(true);
    expect(fs.existsSync(path.join(installedPath, 'src', 'index.py'))).toBe(
      true,
    );

    const manifestContent = fs.readFileSync(
      path.join(installedPath, 'skill.json'),
      'utf8',
    );
    expect(JSON.parse(manifestContent)).toMatchObject({
      name: '@foo/bar',
      version: '1.0.0',
    });

    const catalogPath = path.join(installCwd, '.quark', 'skills', 'store.json');
    expect(fs.existsSync(catalogPath)).toBe(true);
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    expect(catalog.skills?.[`@foo/bar@1.0.0`]).toBeDefined();
    expect(globalFetch.mock.calls[0][0]).toBe(
      'http://localhost:3000/v1/package/%40foo%2Fbar/1.0.0',
    );
    expect(globalFetch.mock.calls[1][0]).toBe(
      'http://localhost:3000/v1/package/%40foo%2Fbar/1.0.0/bundle',
    );

    const secondCwd = path.join(tmpDir, 'second-install-cwd');
    await installSkill('@foo/bar', '1.0.0', false, secondCwd, {
      cacheDir: path.join(tmpDir, 'cache'),
    });
    expect(globalFetch).toHaveBeenCalledTimes(3);
    expect(
      fs.existsSync(
        path.join(
          secondCwd,
          '.quark',
          'skills',
          'foo',
          'bar',
          '1.0.0',
          'src',
          'index.py',
        ),
      ),
    ).toBe(true);

    globalFetch.mockRestore();
  });

  it('rejects a bundle whose SHA-256 does not match metadata', async () => {
    const globalFetch = jest.spyOn(global, 'fetch') as jest.Mock;
    globalFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          version: '1.0.0',
          hash: '0'.repeat(64),
          manifest: {
            name: '@foo/bar',
            version: '1.0.0',
            entrypoint: './index.js',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => Buffer.from('tampered'),
      });

    const installCwd = path.join(tmpDir, 'hash-failure');
    await expect(
      installSkill('@foo/bar', '1.0.0', false, installCwd, {
        cacheDir: path.join(tmpDir, 'cache'),
      }),
    ).rejects.toThrow('SHA-256 mismatch');
    expect(
      fs.existsSync(path.join(installCwd, '.quark', 'skills', 'store.json')),
    ).toBe(false);
    globalFetch.mockRestore();
  });
});

import * as child_process from 'child_process';
import { executeSkill } from './runtime';
import type { Manifest } from '@quark/manifest';

jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue({ on: jest.fn() }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

describe('runtime execution engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should spawn node process for a node runtime skill', () => {
    const manifest: Manifest = {
      name: '@foo/bar',
      version: '1.0.0',
      entrypoint: './index.js',
      runtime: {
        node: '>=20.0.0',
      },
      permissions: {
        filesystem: false,
      },
    };

    const res = executeSkill(manifest, '/path/to/skill', ['--foo'], {
      KEY: 'val',
    });

    expect(res.cmd).toBe('node');
    expect(res.args).toEqual(['/path/to/skill/index.js', '--foo']);
    expect(child_process.spawn).toHaveBeenCalledWith(
      'node',
      ['/path/to/skill/index.js', '--foo'],
      {
        cwd: '/path/to/skill',
        env: {
          PATH: process.env['PATH'] || '',
          KEY: 'val',
        },
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
  });

  it('should spawn python process for a python runtime skill', () => {
    const manifest: Manifest = {
      name: '@foo/bar',
      version: '1.0.0',
      entrypoint: './src/index.py',
      runtime: {
        python: '>=3.12',
      },
      permissions: {
        filesystem: false,
      },
    };

    const res = executeSkill(manifest, '/path/to/skill', [], {});

    expect(res.cmd).toBe('python3');
    expect(res.args).toEqual(['/path/to/skill/src/index.py']);
  });

  it('does not spawn when requested permissions are denied', () => {
    const manifest: Manifest = {
      name: '@foo/bar',
      version: '1.0.0',
      entrypoint: './index.js',
      permissions: { filesystem: true },
    };
    expect(() => executeSkill(manifest, '/path/to/skill')).toThrow(
      'Runtime permissions denied',
    );
    expect(child_process.spawn).not.toHaveBeenCalled();
  });
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as child_process from 'child_process';
import { executeSkill } from '../../src/lib/runtime';
import type { Manifest } from '@quarks.studio/manifest';
import type { SkillExecution } from '../../src/domain';
import type { PermissionEnforcingHost } from '../../src/application';

jest.mock('child_process', () => ({
  spawn: jest
    .fn()
    .mockImplementation(() => new (require('events').EventEmitter)()),
}));

const unrestricted = { filesystem: true, network: ['*'], tools: ['*'] };
const policy = {
  allowFilesystem: true,
  allowedDomains: ['*'],
  allowedTools: ['*'],
};
const manifest: Manifest = {
  name: '@foo/bar',
  version: '1.0.0',
  entrypoint: './index.js',
  runtime: { node: '>=20.0.0' },
  permissions: unrestricted,
};

describe('M01 runtime execution boundary', () => {
  let skillPath: string;
  beforeEach(() => {
    jest.clearAllMocks();
    skillPath = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'quark-runtime-unit-')),
    );
    fs.mkdirSync(path.join(skillPath, 'src'));
    fs.writeFileSync(path.join(skillPath, 'index.js'), '// fixture');
    fs.writeFileSync(path.join(skillPath, 'src/index.py'), '# fixture');
  });
  afterEach(() => {
    for (const result of jest.mocked(child_process.spawn).mock.results)
      result.value?.emit?.('close');
    fs.rmSync(skillPath, { recursive: true, force: true });
  });
  it('starts a node process only with an explicitly unrestricted manifest and policy', () => {
    const result = executeSkill(
      manifest,
      skillPath,
      ['--foo'],
      { KEY: 'val' },
      policy,
    );
    expect(result.cmd).toBe('node');
    expect(result.args).toEqual([
      expect.stringContaining('/quark-execution-'),
      '--foo',
    ]);
    expect(child_process.spawn).toHaveBeenCalledWith('node', result.args, {
      cwd: path.dirname(result.args[0]),
      env: { PATH: process.env['PATH'] || '', KEY: 'val' },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  });
  it('preserves python selection for an explicitly unrestricted execution', () => {
    const result = executeSkill(
      {
        ...manifest,
        entrypoint: './src/index.py',
        runtime: { python: '>=3.12' },
      },
      skillPath,
      [],
      {},
      policy,
    );
    expect(result.cmd).toBe('python3');
    expect(result.args).toEqual([
      expect.stringMatching(/quark-execution-.*\/src\/index\.py$/),
    ]);
  });
  it.each([
    undefined,
    { filesystem: false },
    { ...unrestricted, filesystem: false },
    { ...unrestricted, network: [] },
    { ...unrestricted, network: ['api.example.test'] },
    { ...unrestricted, tools: [] },
    { ...unrestricted, tools: ['echo'] },
  ])(
    'rejects a restricted manifest without an enforcing host (%j)',
    (permissions) => {
      expect(() =>
        executeSkill(
          { ...manifest, permissions } as Manifest,
          skillPath,
          [],
          {},
          policy,
        ),
      ).toThrow('Restricted execution requires a permission-enforcing host');
      expect(child_process.spawn).not.toHaveBeenCalled();
    },
  );
  it('does not start a process or invoke the host when requested permissions are denied', () => {
    const host = { run: jest.fn() };
    expect(() => executeSkill(manifest, skillPath, [], {}, {}, host)).toThrow(
      'Runtime permissions denied',
    );
    expect(child_process.spawn).not.toHaveBeenCalled();
    expect(host.run).not.toHaveBeenCalled();
  });
  it('delegates to an application-configured host with immutable exact requested permissions', () => {
    const requested = {
      filesystem: false,
      network: ['api.example.test'],
      tools: ['echo'],
    };
    const result = {
      process:
        new (require('events').EventEmitter)() as child_process.ChildProcess,
      cmd: 'sandbox',
      args: ['run'],
    };
    const run = jest.fn((_execution: SkillExecution) => result);
    const host: PermissionEnforcingHost = { run };
    expect(
      executeSkill(
        { ...manifest, permissions: requested },
        skillPath,
        ['input'],
        { KEY: 'value' },
        { allowedDomains: ['*.example.test'], allowedTools: ['*'] },
        host,
      ),
    ).toBe(result);
    expect(child_process.spawn).not.toHaveBeenCalled();
    const execution = run.mock.calls[0][0];
    expect(fs.readFileSync(execution.entrypoint, 'utf8')).toBe('// fixture');
    result.process.emit('close');
    expect(execution).toMatchObject({
      runtime: 'node',
      entrypoint: path.join(execution.cwd, 'index.js'),
      cwd: expect.stringContaining('quark-execution-'),
      args: ['input'],
      permissions: requested,
    });
    expect(Object.isFrozen(execution.permissions)).toBe(true);
    expect(Object.isFrozen(execution.permissions.network)).toBe(true);
    expect(Object.isFrozen(execution.permissions.tools)).toBe(true);
    expect(Object.isFrozen(execution.args)).toBe(true);
    expect(Object.isFrozen(execution.env)).toBe(true);
    requested.network.push('other.test');
    expect(execution.permissions.network).toEqual(['api.example.test']);
  });
  it('does not fall back to a normal process if the enforcing host rejects execution', () => {
    const failure = new Error('OS sandbox unavailable');
    const host = {
      run: jest.fn(() => {
        throw failure;
      }),
    };
    expect(() =>
      executeSkill(
        { ...manifest, permissions: { filesystem: false } },
        skillPath,
        [],
        {},
        {},
        host,
      ),
    ).toThrow(failure);
    expect(child_process.spawn).not.toHaveBeenCalled();
  });
  it('rejects an invalid host instead of launching a process', () => {
    expect(() =>
      executeSkill(
        manifest,
        skillPath,
        [],
        {},
        policy,
        {} as PermissionEnforcingHost,
      ),
    ).toThrow('Invalid permission-enforcing host');
    expect(child_process.spawn).not.toHaveBeenCalled();
  });
});

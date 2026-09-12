import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runAgentTests, runSkillTests } from '../lib/runner';

import { runLocalTests } from '../infrastructure/local-tests';

jest.mock('../lib/runner', () => ({
  runSkillTests: jest.fn(),
  runAgentTests: jest.fn(),
}));

const skillRunner = runSkillTests as jest.MockedFunction<typeof runSkillTests>;
const agentRunner = runAgentTests as jest.MockedFunction<typeof runAgentTests>;

describe('runLocalTests', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-test-action-'));
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('runs skill tests in the explicit directory', async () => {
    await fs.writeFile(path.join(root, 'skill.yml'), 'name: demo\n');
    skillRunner.mockResolvedValue(result('skill'));

    await expect(
      runLocalTests({ targetDir: root, tier: 'TIER_2', seed: 7 }),
    ).resolves.toMatchObject({
      targetDir: root,
      packageType: 'skill',
    });
    expect(skillRunner).toHaveBeenCalledWith({
      targetDir: root,
      tierRequested: 'TIER_2',
      seed: 7,
      forceIsolatedSandbox: false,
    });
    expect(agentRunner).not.toHaveBeenCalled();
  });

  it('runs agent tests when agent.yml exists', async () => {
    await fs.writeFile(path.join(root, 'agent.yml'), 'name: demo\n');
    agentRunner.mockResolvedValue(result('agent'));

    await expect(runLocalTests({ targetDir: root })).resolves.toMatchObject({
      packageType: 'agent',
    });
    expect(agentRunner).toHaveBeenCalled();
  });

  it('prefers agent.yml when both manifests exist and forwards isolation', async () => {
    await fs.writeFile(path.join(root, 'agent.yml'), 'name: demo\n');
    await fs.writeFile(path.join(root, 'skill.yml'), 'name: demo\n');
    agentRunner.mockResolvedValue(result('agent'));
    await runLocalTests({ targetDir: root, isolated: true });
    expect(skillRunner).not.toHaveBeenCalled();
    expect(agentRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        seed: 12345,
        forceIsolatedSandbox: true,
        tierRequested: 'TIER_1',
      }),
    );
  });

  it.each([
    { tier: 'INVALID' },
    { seed: 1.5 },
    { seed: Number.NaN },
    { seed: Number.MAX_SAFE_INTEGER + 1 },
  ])(
    'rejects invalid options before invoking a runner: %j',
    async (options) => {
      await fs.writeFile(path.join(root, 'skill.yml'), 'name: demo\n');
      await expect(
        runLocalTests({ targetDir: root, ...options }),
      ).rejects.toThrow();
      expect(skillRunner).not.toHaveBeenCalled();
      expect(agentRunner).not.toHaveBeenCalled();
    },
  );

  it('rejects missing paths and files used as directories', async () => {
    await expect(
      runLocalTests({ targetDir: path.join(root, 'missing') }),
    ).rejects.toThrow('not a directory');
    const file = path.join(root, 'file');
    await fs.writeFile(file, 'content');
    await expect(runLocalTests({ targetDir: file })).rejects.toThrow(
      'not a directory',
    );
  });

  it('rejects directories without a supported manifest', async () => {
    await expect(runLocalTests({ targetDir: root })).rejects.toThrow(
      'No skill.yml or agent.yml',
    );
  });
});

function result(packageType: 'skill' | 'agent') {
  return {
    packageName: 'demo',
    version: '1.0.0',
    packageType,
    tierRequested: 'TIER_1' as const,
    tierAchieved: 'TIER_1' as const,
    passed: true,
    sha256Hash: 'hash',
    coverage: {
      schemaCoverage: 100,
      assertionCoverage: 100,
      invariantCoverage: 100,
      evaluatedPaths: [],
      missingPaths: [],
    },
    durationMs: 1,
    errors: [],
  };
}

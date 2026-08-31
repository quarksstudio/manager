import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runSkillTests } from './runner';
import type { SandboxAdapter } from './types';

const sandbox: SandboxAdapter = {
  name: 'test-process',
  strongNetworkIsolation: false,
  async execute(request) {
    const input = request.input as { context?: { value?: number } };
    return {
      output: { status: 'completed', echoed: input.context?.value },
      stdout: '',
      stderr: '',
      exitCode: 0,
    };
  },
};

describe('@quark/tester runner', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'tester-spec-'));
    await fs.mkdir(path.join(root, 'src'), { recursive: true });
    await fs.writeFile(path.join(root, 'src', 'agent.md'), '# agent');
    await fs.writeFile(
      path.join(root, 'handler.js'),
      `
let data='';
process.stdin.on('data', c => data += c);
process.stdin.on('end', () => {
  const input = JSON.parse(data);
  process.stdout.write(JSON.stringify({output:{status:'completed', echoed:input.context?.value}}));
});
`,
    );
    await fs.writeFile(path.join(root, 'skill.yml'), manifest());
    await fs.writeFile(path.join(root, 'skill.test.yml'), contract());
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('passes deterministic Tier 2 contract execution', async () => {
    const result = await runSkillTests({
      targetDir: root,
      tierRequested: 'TIER_2',
      sandbox,
    });
    expect(result).toMatchObject({
      packageName: 'demo-skill',
      packageType: 'skill',
      tierAchieved: 'TIER_2',
      passed: true,
      errors: [],
    });
    expect(result.sha256Hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.coverage.assertionCoverage).toBe(100);
  });

  it('rejects wildcard mappings before execution', async () => {
    await fs.writeFile(
      path.join(root, 'skill.yml'),
      manifest().replace('src/agent.md', 'src/*.md'),
    );
    const result = await runSkillTests({
      targetDir: root,
      tierRequested: 'TIER_1',
    });
    expect(result.tierAchieved).toBe('FAILED');
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain('Wildcards are not allowed');
  });

  it('reports a failed assertion without modifying the package', async () => {
    await fs.writeFile(
      path.join(root, 'skill.test.yml'),
      contract().replace('completed', 'failed'),
    );
    const result = await runSkillTests({
      targetDir: root,
      tierRequested: 'TIER_2',
      sandbox,
    });
    expect(result.tierAchieved).toBe('TIER_1');
    expect(result.errors[0]).toContain('expected "failed"');
    await expect(
      fs.access(path.join(root, 'skill.lock.yml')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('fails Tier 3 closed on the process sandbox', async () => {
    const result = await runSkillTests({
      targetDir: root,
      tierRequested: 'TIER_3',
      sandbox,
    });
    expect(result.tierAchieved).toBe('TIER_2');
    expect(result.errors[0]).toContain('strong network isolation');
  });

  it('never writes a certificate or lockfile', async () => {
    const result = await runSkillTests({
      targetDir: root,
      tierRequested: 'TIER_1',
    });
    expect(result.passed).toBe(true);
    await expect(
      fs.access(path.join(root, 'skill.lock.yml')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

function manifest(): string {
  return `name: demo-skill
version: 1.0.0
description: deterministic demo
runtime: node
testCommand: node handler.js
mapper_files:
  ".":
    agents:
      agents/demo.md: src/agent.md
`;
}

function contract(): string {
  return `version: "1.0"
skill: demo-skill
environment:
  allow_network: false
  mock_time: "2026-08-31T00:00:00Z"
  timeout_ms: 2000
tests:
  - id: completes
    description: completes deterministically
    input:
      prompt: run
      context:
        value: 7
    http_mocks:
      - request:
          method: POST
          url: https://example.test/action
        response:
          status: 200
          body:
            ok: true
    assertions:
      - type: equals
        path: $.status
        value: completed
property_tests: []
`;
}

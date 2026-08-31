import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  readAgentContract,
  readManifest,
  readSkillContract,
  readYaml,
} from './contracts';
import { collectSchemaPaths, CoverageTracker } from './coverage';
import { ProcessSandbox } from './sandbox/process-sandbox';
import { resolveSchema } from './schema';
import { structuralAudit } from './tiers/tier1';
import {
  evaluateAgentAssertion,
  evaluateSkillAssertion,
} from './tiers/tier2/assertions';
import { runPropertyTest } from './tiers/tier3/properties';
import { CliSecurityRunner } from './tiers/tier3/security';
import { validateAuditContract } from './tiers/tier4';
import type {
  VerificationResult,
  CertificationTier,
  CoverageReport,
  TestRunnerOptions,
} from './types';

const tierOrder: CertificationTier[] = ['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'];
const emptyCoverage = (): CoverageReport => ({
  schemaCoverage: 0,
  assertionCoverage: 0,
  invariantCoverage: 0,
  evaluatedPaths: [],
  missingPaths: [],
});

export async function runSkillTests(
  options: TestRunnerOptions,
): Promise<VerificationResult> {
  return run(options, 'skill');
}

export async function runAgentTests(
  options: TestRunnerOptions,
): Promise<VerificationResult> {
  return run(options, 'agent');
}

async function run(
  options: TestRunnerOptions,
  kind: 'skill' | 'agent',
): Promise<VerificationResult> {
  const started = Date.now();
  let packageName = '';
  let version = '';
  let hash = '';
  let achieved: CertificationTier | undefined;
  let coverage = emptyCoverage();
  try {
    const root = path.resolve(options.targetDir);
    const manifestFile =
      kind === 'agent' && (await exists(path.join(root, 'agent.yml')))
        ? 'agent.yml'
        : 'skill.yml';
    const manifest = await readManifest(root, manifestFile);
    packageName = manifest.name;
    version = manifest.version;
    const structural = await structuralAudit(root, manifest);
    hash = structural.hash;
    achieved = 'TIER_1';
    if (options.tierRequested === 'TIER_1') return success();
    const sandbox = options.sandbox ?? new ProcessSandbox();
    if (options.forceIsolatedSandbox && !sandbox.strongNetworkIsolation)
      throw new Error('Configured sandbox does not provide strong isolation');
    const workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), 'quark-tester-'),
    );
    try {
      await fs.cp(root, workspace, {
        recursive: true,
        filter: (source) => path.basename(source) !== 'skill.lock.yml',
      });
      if (kind === 'skill')
        coverage = await executeSkill(
          workspace,
          manifest.name,
          manifest.testCommand,
          options,
          sandbox,
        );
      else
        coverage = await executeAgent(
          workspace,
          manifest.name,
          manifest.testCommand,
          options,
          sandbox,
        );
      achieved = 'TIER_2';
      if (tierAtLeast(options.tierRequested, 'TIER_3')) {
        if (!sandbox.strongNetworkIsolation)
          throw new Error(
            'TIER_3 requires a sandbox with strong network isolation',
          );
        const securityErrors = await (
          options.securityRunner ?? new CliSecurityRunner()
        ).scan(workspace, 30_000);
        if (securityErrors.length) throw new Error(securityErrors.join('; '));
        if (
          [
            coverage.schemaCoverage,
            coverage.assertionCoverage,
            coverage.invariantCoverage,
          ].some((value) => value !== 100)
        )
          throw new Error(
            'TIER_3 requires 100% schema, assertion, and invariant coverage',
          );
        achieved = 'TIER_3';
      }
      if (options.tierRequested === 'TIER_4') {
        validateAuditContract(
          await readYaml(path.join(root, 'skill.audit.yml')),
        );
        achieved = 'TIER_4';
      }
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
    return success();
  } catch (error) {
    return {
      packageName,
      version,
      packageType: kind,
      tierRequested: options.tierRequested,
      tierAchieved: achieved ?? 'FAILED',
      passed: false,
      sha256Hash: hash,
      coverage,
      durationMs: Date.now() - started,
      errors: [message(error)],
    };
  }

  function success(): VerificationResult {
    const tier = achieved as CertificationTier;
    return {
      packageName,
      version,
      packageType: kind,
      tierRequested: options.tierRequested,
      tierAchieved: tier,
      passed: tier === options.tierRequested,
      sha256Hash: hash,
      coverage,
      durationMs: Date.now() - started,
      errors: [],
    };
  }
}

async function executeSkill(
  workspace: string,
  packageName: string,
  command: string,
  options: TestRunnerOptions,
  sandbox: NonNullable<TestRunnerOptions['sandbox']>,
): Promise<CoverageReport> {
  const contract = await readSkillContract(workspace);
  if (contract.skill !== packageName)
    throw new Error(
      `skill.test.yml targets ${contract.skill}, expected ${packageName}`,
    );
  const resolved = await resolveSchema(
    workspace,
    contract,
    options.schemaResolver,
  );
  const schemaPaths = collectSchemaPaths(resolved.document);
  const assertionIds = contract.tests.flatMap((test) =>
    test.assertions.map((_, index) => `${test.id}:${index}`),
  );
  const invariantIds = contract.property_tests.flatMap((test) =>
    test.invariant_assertions.map((_, index) => `${test.id}:${index}`),
  );
  const tracker = new CoverageTracker({
    schema: schemaPaths,
    assertions: assertionIds,
    invariants: invariantIds,
  });
  for (const test of contract.tests) {
    if (
      tierAtLeast(options.tierRequested, 'TIER_3') &&
      !test.http_mocks?.length
    )
      throw new Error(`TIER_3 requires http_mocks for test ${test.id}`);
    const result = await sandbox.execute({
      command,
      cwd: workspace,
      input: test.input,
      timeoutMs: contract.environment.timeout_ms,
      mockTime: contract.environment.mock_time,
      allowNetwork: contract.environment.allow_network,
      httpMocks: test.http_mocks,
    });
    for (const mock of test.http_mocks ?? [])
      tracker.schemaPath(
        `${mock.request.method} ${new URL(mock.request.url).pathname}`,
      );
    for (const [index, assertion] of test.assertions.entries()) {
      tracker.assertion(`${test.id}:${index}`);
      tracker.schemaPath(
        await evaluateSkillAssertion(assertion, result.output, workspace),
      );
    }
  }
  if (tierAtLeast(options.tierRequested, 'TIER_3')) {
    if (contract.environment.allow_network)
      throw new Error('TIER_3 requires environment.allow_network: false');
    for (const test of contract.property_tests) {
      const paths = await runPropertyTest(
        test,
        command,
        workspace,
        sandbox,
        options.seed ?? 12345,
        contract.environment.timeout_ms,
      );
      paths.forEach((_, index) => tracker.invariant(`${test.id}:${index}`));
    }
  }
  return tracker.report();
}

async function executeAgent(
  workspace: string,
  packageName: string,
  command: string,
  options: TestRunnerOptions,
  sandbox: NonNullable<TestRunnerOptions['sandbox']>,
): Promise<CoverageReport> {
  const contract = await readAgentContract(workspace);
  if (contract.agent !== packageName)
    throw new Error(
      `agent.test.yml targets ${contract.agent}, expected ${packageName}`,
    );
  const ids = contract.tests.flatMap((test) =>
    test.assertions.map((_, index) => `${test.id}:${index}`),
  );
  const tracker = new CoverageTracker({
    schema: [],
    assertions: ids,
    invariants: [],
  });
  if (
    tierAtLeast(options.tierRequested, 'TIER_3') &&
    contract.environment.allow_network
  )
    throw new Error('TIER_3 requires environment.allow_network: false');
  for (const test of contract.tests) {
    const result = await sandbox.execute({
      command,
      cwd: workspace,
      input: test.input,
      timeoutMs: contract.environment.timeout_ms,
      allowNetwork: contract.environment.allow_network,
      toolMocks: test.tool_mocks,
    });
    if ((result.events?.length ?? 0) > contract.environment.max_steps)
      throw new Error(
        `Agent exceeded max_steps ${contract.environment.max_steps}`,
      );
    test.assertions.forEach((assertion, index) => {
      evaluateAgentAssertion(assertion, result.output, result.events);
      tracker.assertion(`${test.id}:${index}`);
    });
  }
  return tracker.report();
}

function tierAtLeast(
  requested: CertificationTier,
  minimum: CertificationTier,
): boolean {
  return tierOrder.indexOf(requested) >= tierOrder.indexOf(minimum);
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

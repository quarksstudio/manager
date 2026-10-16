import type { CertificationTier } from '@quarks.studio/certification';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  readAgentContract,
  readManifest,
  readSkillContract,
  readYaml,
  validateAffectedFileCoverage,
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
  AgentTestContract,
  VerificationResult,
  CoverageReport,
  PropertyTest,
  SkillTestContract,
  SkillTestCase,
  TestRunnerOptions,
  ProgressiveTier3Result,
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
  let progressive: ProgressiveTier3Result | undefined;
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
    if (options.progressiveRound !== undefined) {
      if (!tierAtLeast(options.tierRequested, 'TIER_3'))
        throw new Error('Progressive mutation rounds require TIER_3');
      if (
        !Number.isSafeInteger(options.progressiveRound) ||
        options.progressiveRound < 0
      )
        throw new Error('Progressive round must be a non-negative integer');
      if (
        options.progressiveRound === 0 &&
        (options.progressiveDeletedFiles?.length ?? 0) > 0
      )
        throw new Error('Progressive round 0 cannot delete files');
    }
    if (
      options.progressiveRound === undefined &&
      options.progressiveDeletedFiles !== undefined
    )
      throw new Error('progressiveDeletedFiles requires progressiveRound');
    achieved = 'TIER_1';
    if (options.tierRequested === 'TIER_1') return success();
    const sandbox = options.sandbox ?? new ProcessSandbox();
    if (options.forceIsolatedSandbox && !sandbox.strongNetworkIsolation)
      throw new Error('Configured sandbox does not provide strong isolation');
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'quark-tester-'));
    try {
      await fs.cp(root, workspace, {
        recursive: true,
        filter: (source) => path.basename(source) !== 'skill.lock.yml',
      });
      if (
        tierAtLeast(options.tierRequested, 'TIER_3') &&
        (options.progressiveRound ?? 0) > 0
      ) {
        if (!sandbox.strongNetworkIsolation)
          throw new Error(
            'TIER_3 requires a sandbox with strong network isolation',
          );
        const associations = await readProgressiveCoverage(
          root,
          kind,
          structural.mappedSources,
        );
        const deletedFiles = normalizeDeletedFiles(
          options.progressiveDeletedFiles ?? [],
          structural.mappedSources,
        );
        if (!deletedFiles.length)
          throw new Error(
            'Progressive mutation round must delete at least one file',
          );
        for (const file of deletedFiles)
          await fs.rm(path.join(workspace, file), { force: true });
        const outcomes = await executeProgressiveRound(
          workspace,
          manifest.testCommand,
          options,
          sandbox,
          kind,
          associations.tests,
          deletedFiles,
          associations.propertyTests,
        );
        const mismatches = outcomes.filter(
          (item) => item.expected === 'false' || item.expected !== item.actual,
        );
        progressive = {
          round: options.progressiveRound!,
          candidates: structural.mappedSources,
          deletedFiles,
          coverage: associations.coverage,
          outcomes,
        };
        if (mismatches.length) {
          throw new Error(
            `Progressive Tier 3 round ${options.progressiveRound} had unexpected test results: ${mismatches.map((item) => `${item.testId} expected ${item.expected}, got ${item.actual}`).join('; ')}`,
          );
        }
        const securityErrors = await (
          options.securityRunner ?? new CliSecurityRunner()
        ).scan(workspace, 30_000);
        if (securityErrors.length) throw new Error(securityErrors.join('; '));
        achieved = 'TIER_3';
      } else {
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
      }
      if (tierAtLeast(options.tierRequested, 'TIER_3')) {
        if (!progressive) {
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
          const associations = await readProgressiveCoverage(
            root,
            kind,
            structural.mappedSources,
          );
          progressive = {
            round: options.progressiveRound ?? 0,
            candidates: structural.mappedSources,
            deletedFiles: [],
            coverage: associations.coverage,
            outcomes: [
              ...associations.tests.map((test) => ({
                testId: test.id,
                affectedFiles: test.affected_files ?? [],
                expected: (test.affected_files?.length ? 'pass' : 'false') as
                  'pass' | 'false',
                actual: (test.affected_files?.length ? 'pass' : 'fail') as
                  'pass' | 'fail',
              })),
              ...associations.propertyTests.map((test) => ({
                testId: test.id,
                affectedFiles: test.affected_files ?? [],
                expected: (test.affected_files?.length ? 'pass' : 'false') as
                  'pass' | 'false',
                actual: (test.affected_files?.length ? 'pass' : 'fail') as
                  'pass' | 'fail',
              })),
            ],
          };
          const unassociated = progressive.outcomes.filter(
            (item) => item.expected === 'false',
          );
          if (unassociated.length) {
            throw new Error(
              `Tier 3 tests must be associated with mapped source files: ${unassociated.map((item) => item.testId).join(', ')}`,
            );
          }
        }
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
      ...(progressive ? { progressive } : {}),
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
      ...(progressive ? { progressive } : {}),
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

async function readProgressiveCoverage(
  root: string,
  kind: 'skill' | 'agent',
  mappedSources: string[],
): Promise<{
  tests: Array<SkillTestCase | AgentTestContract['tests'][number]>;
  propertyTests: PropertyTest[];
  coverage: Record<string, string[]>;
}> {
  if (kind === 'skill') {
    const contract = await readSkillContract(root);
    const tests = [...contract.tests, ...contract.property_tests] as Array<{
      id: string;
      affected_files?: string[];
    }>;
    return {
      tests: contract.tests,
      propertyTests: contract.property_tests,
      coverage: validateAffectedFileCoverage(mappedSources, tests),
    };
  }
  const contract = await readAgentContract(root);
  return {
    tests: contract.tests,
    propertyTests: [],
    coverage: validateAffectedFileCoverage(mappedSources, contract.tests),
  };
}

function normalizeDeletedFiles(
  files: string[],
  candidates: string[],
): string[] {
  const available = new Set(candidates.map(normalizePackagePath));
  const normalized = files.map(normalizePackagePath);
  if (new Set(normalized).size !== normalized.length)
    throw new Error('Progressive deletedFiles contains duplicate paths');
  const unsupported = normalized.filter((file) => !available.has(file));
  if (unsupported.length)
    throw new Error(
      `Progressive deletedFiles must contain mapper_files sources: ${unsupported.join(', ')}`,
    );
  return normalized.sort();
}

function normalizePackagePath(value: string): string {
  const normalized = value.replace(/\\/g, '/');
  if (
    normalized.startsWith('/') ||
    normalized.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error(`Invalid package path: ${value}`);
  return normalized;
}

async function executeProgressiveRound(
  workspace: string,
  command: string,
  options: TestRunnerOptions,
  sandbox: NonNullable<TestRunnerOptions['sandbox']>,
  kind: 'skill' | 'agent',
  tests: Array<SkillTestCase | AgentTestContract['tests'][number]>,
  deletedFiles: string[],
  propertyTests: PropertyTest[],
): Promise<ProgressiveTier3Result['outcomes']> {
  const deleted = new Set(deletedFiles);
  const skillEnvironment =
    kind === 'skill'
      ? (await readSkillContract(workspace)).environment
      : undefined;
  const agentEnvironment =
    kind === 'agent'
      ? (await readAgentContract(workspace)).environment
      : undefined;
  if (skillEnvironment?.allow_network || agentEnvironment?.allow_network)
    throw new Error('TIER_3 requires environment.allow_network: false');
  const timeoutMs =
    skillEnvironment?.timeout_ms ?? agentEnvironment!.timeout_ms;
  const outcomes: ProgressiveTier3Result['outcomes'] = [];

  for (const test of tests) {
    const affectedFiles = (test.affected_files ?? []).map(normalizePackagePath);
    if (!affectedFiles.length) {
      outcomes.push({
        testId: test.id,
        affectedFiles,
        expected: 'false',
        actual: 'fail',
        error: 'Test is not associated with a mapped source file',
      });
      continue;
    }
    const expected = affectedFiles.some((file) => deleted.has(file))
      ? 'fail'
      : 'pass';
    let errorMessage: string | undefined;
    try {
      if ('http_mocks' in test && !test.http_mocks?.length)
        throw new Error(`TIER_3 requires http_mocks for test ${test.id}`);
      const result = await sandbox.execute({
        command,
        cwd: workspace,
        input: test.input,
        timeoutMs,
        allowNetwork: false,
        ...(skillEnvironment?.mock_time
          ? { mockTime: skillEnvironment.mock_time }
          : {}),
        ...('http_mocks' in test ? { httpMocks: test.http_mocks } : {}),
        ...('tool_mocks' in test ? { toolMocks: test.tool_mocks } : {}),
      });
      if (kind === 'skill') {
        for (const assertion of (test as SkillTestCase).assertions)
          await evaluateSkillAssertion(assertion, result.output, workspace);
      } else {
        const agentTest = test as AgentTestContract['tests'][number];
        if ((result.events?.length ?? 0) > agentEnvironment!.max_steps)
          throw new Error('Agent exceeded max_steps');
        for (const assertion of agentTest.assertions)
          evaluateAgentAssertion(assertion, result.output, result.events);
      }
    } catch (error) {
      errorMessage = message(error);
    }
    const actual = errorMessage ? 'fail' : 'pass';
    outcomes.push({
      testId: test.id,
      affectedFiles,
      expected,
      actual,
      ...(errorMessage ? { error: errorMessage } : {}),
    });
  }

  for (const test of propertyTests) {
    const affectedFiles = (test.affected_files ?? []).map(normalizePackagePath);
    if (!affectedFiles.length) {
      outcomes.push({
        testId: test.id,
        affectedFiles,
        expected: 'false',
        actual: 'fail',
        error: 'Test is not associated with a mapped source file',
      });
      continue;
    }
    const expected = affectedFiles.some((file) => deleted.has(file))
      ? 'fail'
      : 'pass';
    let errorMessage: string | undefined;
    try {
      await runPropertyTest(
        test,
        command,
        workspace,
        sandbox,
        options.seed ?? 12345,
        timeoutMs,
      );
    } catch (error) {
      errorMessage = message(error);
    }
    const actual = errorMessage ? 'fail' : 'pass';
    outcomes.push({
      testId: test.id,
      affectedFiles,
      expected,
      actual,
      ...(errorMessage ? { error: errorMessage } : {}),
    });
  }
  return outcomes;
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

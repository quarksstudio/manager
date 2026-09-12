import {
  parseCertificationTier,
  type CertificationTier,
  type TestRunnerOptions,
  type VerificationResult,
} from '../lib/types';

export interface TestOptions {
  targetDir?: string;
  tier?: string;
  seed?: number;
  isolated?: boolean;
}

export interface TestResult extends VerificationResult {
  targetDir: string;
}

export interface LocalTestDependencies {
  inspect(
    directory?: string,
  ): Promise<{ targetDir: string; kind: 'agent' | 'skill' }>;
  runAgent(options: TestRunnerOptions): Promise<VerificationResult>;
  runSkill(options: TestRunnerOptions): Promise<VerificationResult>;
}

export function createRunLocalTests(dependencies: LocalTestDependencies) {
  return async function runLocalTests(
    options: TestOptions = {},
  ): Promise<TestResult> {
    const target = await dependencies.inspect(options.targetDir);
    const tier = normalizeTier(options.tier ?? 'TIER_1');
    const seed = options.seed ?? 12345;
    if (!Number.isSafeInteger(seed)) throw new Error(`Invalid seed: ${seed}`);
    const runnerOptions: TestRunnerOptions = {
      targetDir: target.targetDir,
      tierRequested: tier,
      seed,
      forceIsolatedSandbox: options.isolated ?? false,
    };
    const result = await (
      target.kind === 'agent' ? dependencies.runAgent : dependencies.runSkill
    )(runnerOptions);
    return { ...result, targetDir: target.targetDir };
  };
}

export function normalizeTier(value: string): CertificationTier {
  return parseCertificationTier(value);
}

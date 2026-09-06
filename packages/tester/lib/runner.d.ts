import type { VerificationResult, TestRunnerOptions } from './types';
export declare function runSkillTests(options: TestRunnerOptions): Promise<VerificationResult>;
export declare function runAgentTests(options: TestRunnerOptions): Promise<VerificationResult>;

import type { CertificationResult, TestRunnerOptions } from './types';
export declare function runSkillTests(options: TestRunnerOptions): Promise<CertificationResult>;
export declare function runAgentTests(options: TestRunnerOptions): Promise<CertificationResult>;
export declare function certifyPackage(options: TestRunnerOptions): Promise<CertificationResult>;

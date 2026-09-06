import type { PropertyTest, SandboxAdapter } from '../../types';
export declare function runPropertyTest(test: PropertyTest, command: string, workspace: string, sandbox: SandboxAdapter, seed: number, timeoutMs: number): Promise<string[]>;

import type { SecurityRunner } from '../../types';
export declare class CliSecurityRunner implements SecurityRunner {
    scan(targetDir: string, timeoutMs: number): Promise<string[]>;
}

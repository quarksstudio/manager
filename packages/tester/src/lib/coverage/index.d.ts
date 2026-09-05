import type { CoverageReport } from '../types';
export declare class CoverageTracker {
  private readonly expected;
  private readonly schema;
  private readonly assertions;
  private readonly invariants;
  constructor(expected: {
    schema: string[];
    assertions: string[];
    invariants: string[];
  });
  schemaPath(path: string): void;
  assertion(id: string): void;
  invariant(id: string): void;
  report(): CoverageReport;
}
export declare function collectSchemaPaths(document: unknown): string[];

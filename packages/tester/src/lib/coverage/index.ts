import type { CoverageReport } from '../types';

export class CoverageTracker {
  private readonly schema = new Set<string>();
  private readonly assertions = new Set<string>();
  private readonly invariants = new Set<string>();
  constructor(private readonly expected: { schema: string[]; assertions: string[]; invariants: string[] }) {}
  schemaPath(path: string): void {
    for (const expected of this.expected.schema) if (matchesObligation(expected, path)) this.schema.add(expected);
  }
  assertion(id: string): void { this.assertions.add(id); }
  invariant(id: string): void { this.invariants.add(id); }
  report(): CoverageReport {
    const missing = [
      ...this.expected.schema.filter((p) => !this.schema.has(p)).map((p) => `schema:${p}`),
      ...this.expected.assertions.filter((p) => !this.assertions.has(p)).map((p) => `assertion:${p}`),
      ...this.expected.invariants.filter((p) => !this.invariants.has(p)).map((p) => `invariant:${p}`),
    ];
    return {
      schemaCoverage: percent(this.schema.size, this.expected.schema.length),
      assertionCoverage: percent(this.assertions.size, this.expected.assertions.length),
      invariantCoverage: percent(this.invariants.size, this.expected.invariants.length),
      evaluatedPaths: [...this.schema, ...this.assertions, ...this.invariants].sort(), missingPaths: missing.sort(),
    };
  }
}

function percent(done: number, total: number): number { return total === 0 ? 100 : Number(((done / total) * 100).toFixed(2)); }

function matchesObligation(expected: string, observed: string): boolean {
  if (expected === observed) return true;
  const escaped = expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[^}]+\\\}/g, '[^/]+');
  return new RegExp(`^${escaped}$`).test(observed);
}

export function collectSchemaPaths(document: unknown): string[] {
  const paths = new Set<string>();
  if (typeof document !== 'object' || document === null) return [];
  const openapiPaths = (document as { paths?: Record<string, Record<string, unknown>> }).paths;
  for (const [route, operations] of Object.entries(openapiPaths ?? {})) {
    for (const method of Object.keys(operations)) if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) paths.add(`${method.toUpperCase()} ${route}`);
  }
  const properties = (document as { properties?: Record<string, unknown> }).properties;
  for (const name of Object.keys(properties ?? {})) paths.add(`$.${name}`);
  return [...paths].sort();
}

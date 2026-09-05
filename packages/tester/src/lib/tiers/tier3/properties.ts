import * as fc from 'fast-check';

import type { PropertyTest, SandboxAdapter } from '../../types';
import { getJsonPath } from '../tier2/json-path';

export async function runPropertyTest(
  test: PropertyTest,
  command: string,
  workspace: string,
  sandbox: SandboxAdapter,
  seed: number,
  timeoutMs: number,
): Promise<string[]> {
  const entries = Object.entries(test.generator);
  const arbitrary = fc.record(
    Object.fromEntries(
      entries.map(([name, spec]) => [name, parseGenerator(spec)]),
    ),
  );
  const paths = test.invariant_assertions.map((item) => item.expression);
  await fc.assert(
    fc.asyncProperty(arbitrary, async (input) => {
      const result = await sandbox.execute({
        command,
        cwd: workspace,
        input: { property_test: test.id, input },
        timeoutMs,
        allowNetwork: false,
      });
      for (const invariant of test.invariant_assertions) {
        if (!evaluateInvariant(invariant.expression, result.output, input))
          throw new Error(`Invariant failed: ${invariant.expression}`);
      }
    }),
    { seed, numRuns: 1000, endOnFailure: true },
  );
  return paths;
}

function parseGenerator(spec: string): fc.Arbitrary<number> {
  const match =
    /^(integer|float)\(min=(-?\d+(?:\.\d+)?),\s*max=(-?\d+(?:\.\d+)?)\)$/.exec(
      spec.trim(),
    );
  if (!match) throw new Error(`Unsupported property generator: ${spec}`);
  const min = Number(match[2]);
  const max = Number(match[3]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max)
    throw new Error(`Invalid property generator bounds: ${spec}`);
  return match[1] === 'integer'
    ? fc.integer({ min, max })
    : fc.float({ min, max, noNaN: true });
}

function evaluateInvariant(
  expression: string,
  output: unknown,
  input: Record<string, number>,
): boolean {
  const match = /^(.+?)\s*(<=|>=|===|==|<|>)\s*(.+)$/.exec(expression.trim());
  if (!match)
    throw new Error(`Unsupported invariant expression: ${expression}`);
  const left = operand(match[1].trim(), output, input);
  const right = operand(match[3].trim(), output, input);
  switch (match[2]) {
    case '<=':
      return left <= right;
    case '>=':
      return left >= right;
    case '<':
      return left < right;
    case '>':
      return left > right;
    case '==':
    case '===':
      return left === right;
    default:
      return false;
  }
}

function operand(
  source: string,
  output: unknown,
  input: Record<string, number>,
): number {
  const numeric = Number(source);
  if (source !== '' && Number.isFinite(numeric)) return numeric;
  if (source.startsWith('input.'))
    return requiredNumber(input[source.slice(6)], source);
  if (source.startsWith('$.'))
    return requiredNumber(getJsonPath(output, source), source);
  throw new Error(`Unsupported invariant operand: ${source}`);
}

function requiredNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`Invariant operand is not numeric: ${label}`);
  return value;
}

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import Ajv from 'ajv';

import { requireRegularFile } from '../../path-safety';
import type { AgentAssertion, SkillAssertion } from '../../types';
import { getJsonPath } from './json-path';

export async function evaluateSkillAssertion(assertion: SkillAssertion, output: unknown, workspace: string): Promise<string> {
  if (assertion.type === 'equals') {
    const actual = getJsonPath(output, assertion.path);
    if (!deepEqual(actual, assertion.value)) throw new Error(`${assertion.path}: expected ${JSON.stringify(assertion.value)}, received ${JSON.stringify(actual)}`);
    return assertion.path;
  }
  if (assertion.type === 'regex') {
    const actual = getJsonPath(output, assertion.path);
    if (typeof actual !== 'string' || !new RegExp(assertion.value).test(actual)) throw new Error(`${assertion.path}: value did not match /${assertion.value}/`);
    return assertion.path;
  }
  if (assertion.type === 'schema') {
    const schemaPath = await requireRegularFile(workspace, assertion.schema_file);
    const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8')) as object;
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    if (!validate(getJsonPath(output, assertion.path))) throw new Error(`${assertion.path}: schema validation failed: ${new Ajv({ strict: false }).errorsText(validate.errors)}`);
    return assertion.path;
  }
  const file = await requireRegularFile(workspace, assertion.path);
  if (assertion.type === 'file_created') {
    const stat = await fs.stat(file);
    if (stat.size > assertion.max_bytes) throw new Error(`${assertion.path}: ${stat.size} exceeds ${assertion.max_bytes} bytes`);
    const digest = createHash('sha256').update(await fs.readFile(file)).digest('hex');
    if (digest !== assertion.sha256.toLowerCase()) throw new Error(`${assertion.path}: SHA-256 mismatch`);
  } else {
    const content = await fs.readFile(file, 'utf8');
    if (!new RegExp(assertion.content_regex).test(content)) throw new Error(`${assertion.path}: content did not match /${assertion.content_regex}/`);
  }
  return assertion.path;
}

export function evaluateAgentAssertion(assertion: AgentAssertion, output: unknown, events: Array<{ tool: string }> = []): string {
  if (assertion.type === 'regex') {
    const actual = getJsonPath(output, assertion.path);
    if (typeof actual !== 'string' || !new RegExp(assertion.value).test(actual)) throw new Error(`${assertion.path}: value did not match`);
    return assertion.path;
  }
  if (assertion.type === 'trajectory_sequence') {
    const actual = events.map((event) => event.tool);
    if (!deepEqual(actual, assertion.steps)) throw new Error(`trajectory: expected ${JSON.stringify(assertion.steps)}, received ${JSON.stringify(actual)}`);
    return '$.trajectory';
  }
  if (events.length > assertion.limit) throw new Error(`trajectory: ${events.length} steps exceeds ${assertion.limit}`);
  return '$.trajectory.length';
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

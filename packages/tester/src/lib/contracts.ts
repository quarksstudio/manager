import { promises as fs } from 'fs';
import * as path from 'path';
import { parse } from 'yaml';
import { z } from 'zod';

import type {
  AgentTestContract,
  PackageManifest,
  SkillTestContract,
} from './types';

const record = z.record(z.unknown());
const httpMock = z
  .object({
    request: z
      .object({
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
        url: z.string().url(),
      })
      .strict(),
    response: z
      .object({
        status: z.number().int().min(100).max(599),
        body: z.unknown().optional(),
      })
      .strict(),
    times: z.number().int().positive().optional(),
  })
  .strict();
const skillAssertion = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('equals'),
      path: z.string().min(1),
      value: z.unknown(),
    })
    .strict(),
  z
    .object({
      type: z.literal('regex'),
      path: z.string().min(1),
      value: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal('schema'),
      path: z.string().min(1),
      schema_file: z.string().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal('file_created'),
      path: z.string().min(1),
      max_bytes: z.number().int().positive(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    })
    .strict(),
  z
    .object({
      type: z.literal('file_match'),
      path: z.string().min(1),
      content_regex: z.string(),
    })
    .strict(),
]);
const toolMock = z
  .object({
    tool: z.string().min(1),
    when_args: record.optional(),
    returns: record.optional(),
  })
  .strict();
const agentAssertion = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('trajectory_sequence'),
      steps: z.array(z.string().min(1)),
    })
    .strict(),
  z
    .object({
      type: z.literal('max_steps_not_exceeded'),
      limit: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      type: z.literal('regex'),
      path: z.string().min(1),
      value: z.string(),
    })
    .strict(),
]);

const skillContractSchema = z
  .object({
    version: z.literal('1.0'),
    skill: z.string().min(1),
    environment: z
      .object({
        allow_network: z.boolean().default(false),
        mock_time: z.string().datetime().optional(),
        timeout_ms: z.number().int().positive().default(5000),
      })
      .strict(),
    schema_contract: z
      .object({
        file: z.string().min(1).optional(),
        url: z
          .string()
          .url()
          .refine((v) => v.startsWith('https://'), 'schema URL must use HTTPS')
          .optional(),
      })
      .strict()
      .refine(
        (v) => Number(Boolean(v.file)) + Number(Boolean(v.url)) === 1,
        'specify exactly one of file or url',
      )
      .optional(),
    tests: z
      .array(
        z
          .object({
            id: z.string().min(1),
            description: z.string().min(1),
            input: z
              .object({ prompt: z.string(), context: record.optional() })
              .strict(),
            http_mocks: z.array(httpMock).optional(),
            assertions: z.array(skillAssertion).min(1),
          })
          .strict(),
      )
      .default([]),
    property_tests: z
      .array(
        z
          .object({
            id: z.string().min(1),
            description: z.string().min(1),
            generator: z.record(z.string()),
            invariant_assertions: z
              .array(z.object({ expression: z.string().min(1) }).strict())
              .min(1),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

const agentContractSchema = z
  .object({
    version: z.literal('1.0'),
    agent: z.string().min(1),
    environment: z
      .object({
        max_steps: z.number().int().positive(),
        allow_network: z.boolean().default(false),
        temperature: z.literal(0),
        timeout_ms: z.number().int().positive().default(5000),
      })
      .strict(),
    tests: z
      .array(
        z
          .object({
            id: z.string().min(1),
            description: z.string().min(1),
            input: z.object({ prompt: z.string() }).strict(),
            tool_mocks: z.array(toolMock).optional(),
            assertions: z.array(agentAssertion).min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export async function readYaml(file: string): Promise<unknown> {
  return parse(await fs.readFile(file, 'utf8')) as unknown;
}

export async function readSkillContract(
  root: string,
): Promise<SkillTestContract> {
  const value = skillContractSchema.parse(
    await readYaml(path.join(root, 'skill.test.yml')),
  );
  const contract = value as SkillTestContract;
  assertUniqueIds([...contract.tests, ...contract.property_tests]);
  return contract;
}

export async function readAgentContract(
  root: string,
): Promise<AgentTestContract> {
  const value = agentContractSchema.parse(
    await readYaml(path.join(root, 'agent.test.yml')),
  );
  const contract = value as AgentTestContract;
  assertUniqueIds(contract.tests);
  return contract;
}

export async function readManifest(
  root: string,
  filename = 'skill.yml',
): Promise<PackageManifest> {
  const value = z
    .object({
      name: z.string().min(1),
      version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
      description: z.string().min(1),
      runtime: z.enum(['node', 'python']).optional(),
      testCommand: z.string().min(1),
      mapper_files: z
        .record(
          z
            .object({
              agents: z.record(z.string()).optional(),
              tools: z.record(z.string()).optional(),
            })
            .strict(),
        )
        .optional(),
      isCertified: z.boolean().optional(),
    })
    .passthrough()
    .parse(await readYaml(path.join(root, filename)));
  return value as PackageManifest;
}

function assertUniqueIds(items: Array<{ id: string }>): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`Duplicate test id: ${item.id}`);
    seen.add(item.id);
  }
}

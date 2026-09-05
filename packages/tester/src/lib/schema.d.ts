import type { SchemaResolver, SkillTestContract } from './types';
export declare function resolveSchema(
  root: string,
  contract: SkillTestContract,
  resolver?: SchemaResolver,
): Promise<{
  document?: unknown;
  sha256?: string;
}>;

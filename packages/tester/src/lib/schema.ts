import { createHash } from 'crypto';
import { promises as fs } from 'fs';

import { requireRegularFile } from './path-safety';
import type { SchemaResolver, SkillTestContract } from './types';

export async function resolveSchema(
  root: string,
  contract: SkillTestContract,
  resolver?: SchemaResolver,
): Promise<{ document?: unknown; sha256?: string }> {
  if (!contract.schema_contract) return {};
  if (contract.schema_contract.file) {
    const file = await requireRegularFile(root, contract.schema_contract.file);
    const data = await fs.readFile(file);
    return {
      document: JSON.parse(data.toString('utf8')) as unknown,
      sha256: createHash('sha256').update(data).digest('hex'),
    };
  }
  if (!resolver)
    throw new Error('Remote schema requires an injected SchemaResolver');
  return resolver.resolve(contract.schema_contract.url as string);
}

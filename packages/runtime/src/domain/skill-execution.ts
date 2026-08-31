import { DomainError } from '@quark/types';

export type RuntimeKind = 'node' | 'python' | 'native';
export class SkillExecution {
  constructor(
    readonly runtime: RuntimeKind,
    readonly entrypoint: string,
    readonly args: readonly string[],
    readonly cwd: string,
    readonly env: Readonly<Record<string, string>>,
  ) {
    if (!entrypoint)
      throw new DomainError(
        'execution.missing_entrypoint',
        'Entrypoint is required',
      );
  }
}

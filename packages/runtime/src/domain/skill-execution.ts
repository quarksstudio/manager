import type { PermissionRequest } from '@quarks.studio/permissions';
import { DomainError } from '@quarks.studio/domain-kernel';

export type RuntimeKind = 'node' | 'python' | 'native';
export class SkillExecution {
  constructor(
    readonly runtime: RuntimeKind,
    readonly entrypoint: string,
    readonly args: readonly string[],
    readonly cwd: string,
    readonly env: Readonly<Record<string, string>>,
    readonly permissions: Readonly<PermissionRequest> = Object.freeze({
      filesystem: false,
      network: Object.freeze([]),
      tools: Object.freeze([]),
    }),
  ) {
    if (!entrypoint)
      throw new DomainError(
        'execution.missing_entrypoint',
        'Entrypoint is required',
      );
  }
}

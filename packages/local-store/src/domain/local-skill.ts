import { DomainError } from '@quark/types';

export interface LocalSkillProps {
  name: string;
  version: string;
  path: string;
  hash?: string;
  source?: string;
  dependencies?: Record<string, string>;
  enabled: boolean;
  installedAt: string;
}
export class LocalSkillInstallation {
  private constructor(private readonly props: LocalSkillProps) {}
  static restore(props: LocalSkillProps): LocalSkillInstallation {
    if (!props.name || !props.version || !props.path) {
      throw new DomainError(
        'local_store.invalid_installation',
        'Invalid local skill installation',
      );
    }
    return new LocalSkillInstallation({
      ...props,
      dependencies: { ...(props.dependencies || {}) },
    });
  }
  enable(): void {
    this.props.enabled = true;
  }
  disable(): void {
    this.props.enabled = false;
  }
  snapshot(): LocalSkillProps {
    return {
      ...this.props,
      dependencies: { ...(this.props.dependencies || {}) },
    };
  }
}

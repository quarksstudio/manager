import { DomainError } from '@quark/types';

export type InstallationState =
  'requested' | 'authorized' | 'verified' | 'installed' | 'failed';

export class SkillCoordinate {
  private constructor(
    readonly name: string,
    readonly version: string,
  ) {}
  static create(name: string, version: string): SkillCoordinate {
    if (!/^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i.test(name)) {
      throw new DomainError(
        'installation.invalid_name',
        `Invalid skill name: ${name}`,
      );
    }
    if (
      !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
        version,
      )
    ) {
      throw new DomainError(
        'installation.invalid_version',
        `Invalid semantic version: ${version}`,
      );
    }
    return new SkillCoordinate(name, version);
  }
}

export class SkillInstallation {
  private state: InstallationState = 'requested';
  constructor(readonly coordinate: SkillCoordinate) {}
  authorize(): void {
    this.transition('requested', 'authorized');
  }
  verify(): void {
    this.transition('authorized', 'verified');
  }
  complete(): void {
    this.transition('verified', 'installed');
  }
  fail(): void {
    if (this.state !== 'installed') this.state = 'failed';
  }
  get status(): InstallationState {
    return this.state;
  }
  private transition(
    expected: InstallationState,
    next: InstallationState,
  ): void {
    if (this.state !== expected) {
      throw new DomainError(
        'installation.invalid_transition',
        `Cannot transition ${this.state} to ${next}`,
      );
    }
    this.state = next;
  }
}

import type { CertificationTier } from '@quark/tester';

export interface PublishOptions {
  sourceDir?: string;
  tier?: CertificationTier;
  outputDir?: string;
  token?: string;
  upload?: boolean;
  dryRun?: boolean;
}

export interface PublishResult {
  archive: string;
  packageName: string;
  version: string;
  passed: boolean;
  uploaded: boolean;
}

export interface PublicationSource {
  root: string;
  kind: 'skill' | 'agent';
  packageName: string;
  version: string;
  manifest: Record<string, unknown>;
}

export interface PublishProgress {
  stage: 'validate' | 'verify' | 'pack' | 'upload';
  status: 'active' | 'success' | 'error' | 'skipped';
  detail?: string;
}

export class VerificationFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationFailure';
  }
}

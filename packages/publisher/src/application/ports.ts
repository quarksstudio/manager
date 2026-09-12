import type { CertificationTier, VerificationResult } from '@quark/tester';
import type { PublicationSource } from '../domain/publication';

export interface ArchiveContent {
  fileName: string;
  content: Uint8Array;
}

export interface PublicationProject {
  inspect(sourceDir?: string): Promise<PublicationSource>;
  writeSnapshot(
    source: PublicationSource,
    snapshot: Record<string, unknown>,
  ): Promise<void>;
  readArchive(archive: string): Promise<ArchiveContent>;
}

export interface PublicationVerifier {
  verify(
    source: PublicationSource,
    tier: CertificationTier,
  ): Promise<VerificationResult>;
}

export interface PublicationPackager {
  pack(source: PublicationSource, outputDir?: string): Promise<string>;
}

export interface PublicationUploader {
  upload(
    input: ArchiveContent & {
      packageName: string;
      version: string;
      description: string;
      token?: string;
    },
  ): Promise<void>;
}

export interface PublisherDependencies {
  project: PublicationProject;
  verifier: PublicationVerifier;
  packager: PublicationPackager;
  uploader: PublicationUploader;
  now: () => string;
}

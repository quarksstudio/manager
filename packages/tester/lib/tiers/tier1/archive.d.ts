import type { PackageManifest } from '../../types';
export interface PackageArchiveInspection {
  hash: string;
  sizeBytes: number;
  files: string[];
  manifest: PackageManifest;
}
export declare function inspectPackageArchive(
  buffer: Buffer,
  expected: {
    name: string;
    version: string;
  },
): Promise<PackageArchiveInspection>;
export declare function auditTarArchive(
  source: string | Buffer,
): Promise<string[]>;

import type { PackageManifest } from '../../types';
export declare function structuralAudit(root: string, manifest: PackageManifest): Promise<{
    hash: string;
    mappedSources: string[];
}>;
export declare function canonicalDirectoryHash(root: string): Promise<string>;

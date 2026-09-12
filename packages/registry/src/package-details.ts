import type { Certification } from '@quark/types/models';

export type { Certification } from '@quark/types/models';

export interface PackageVersion {
  version: string;
  date?: string;
  publishedBy?: string;
  reports?: number;
  files?: string[];
  certifications?: Certification[];
}

export interface PackageDetails {
  id: string;
  name: string;
  description: string;
  authors: string[];
  tags: string[];
  downloads: number;
  downloadsSince?: string;
  canEditMetadata: boolean;
  createdAt?: string;
  updatedAt?: string;
  latest?: PackageVersion | null;
  versions?: PackageVersion[];
}

export interface PackageReadme {
  content: string;
}

export interface UpdatePackageMetadataInput {
  id: string;
  description: string;
  tags: string[];
  authors: string[];
}

const PRERELEASE_ORDER: Record<string, number> = {
  alpha: 1,
  beta: 2,
  rc: 3,
};

function parse(version: string): number[] {
  return version
    .split(/[-+]/)[0]
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

function prereleaseRank(version: string): number {
  const segment = version.split('-')[1];
  if (!segment) return Number.MAX_SAFE_INTEGER;
  const name = segment.split('.')[0].toLowerCase();
  return PRERELEASE_ORDER[name] ?? 0;
}

export function compareVersions(first: string, second: string): number {
  const left = parse(first);
  const right = parse(second);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta;
  }
  const prerelease = prereleaseRank(first) - prereleaseRank(second);
  return prerelease !== 0 ? prerelease : first.localeCompare(second);
}

export function sortVersions(versions: PackageVersion[]): PackageVersion[] {
  return [...versions].sort((a, b) => compareVersions(b.version, a.version));
}

export function highestVersion(
  versions: PackageVersion[] = [],
): PackageVersion | null {
  const sorted = sortVersions(versions);
  return sorted[0] ?? null;
}

export function certificationsForVersion(
  detail: Pick<PackageDetails, 'versions'> | null,
  version?: string,
): Certification[] {
  if (!detail?.versions?.length) return [];
  const target = version ?? highestVersion(detail.versions)?.version;
  const selected = detail.versions.find((item) => item.version === target);
  return selected?.certifications ?? [];
}

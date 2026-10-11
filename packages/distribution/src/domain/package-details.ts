import type { Certification } from '@quarks.studio/certification';
import type {
  PackageDetails,
  PackageVersion,
} from '@quarks.studio/registry/domain';
export type {
  PackageDetails,
  PackageVersion,
  UpdatePackageMetadataInput,
} from '@quarks.studio/registry/domain';

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
  detail: Pick<PackageDetails, 'versions' | 'latestVersion'> | null,
  version?: string,
): Certification[] {
  if (!detail?.versions?.length) return [];
  const target = version ?? detail.latestVersion;
  const selected = detail.versions.find((item) => item.version === target);
  return selected?.certifications ?? [];
}

export function selectPackageVersion(
  detail: Pick<PackageDetails, 'versions' | 'latestVersion'>,
  selector = 'latest',
): PackageVersion | null {
  const target =
    !selector || selector === 'latest'
      ? detail.latestVersion || detail.versions[0].version
      : selector === 'cert'
        ? sortVersions(detail.versions).find((version) =>
            version.certifications?.some((cert) => cert.status === 'approved'),
          )?.version
        : selector;
  return detail.versions.find((version) => version.version === target) ?? null;
}

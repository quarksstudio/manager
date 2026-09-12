import { useCallback, useMemo, useState } from 'react';
import {
  ApiError,
  certificationsForVersion,
  highestVersion,
  sortVersions,
  useRegistryClient,
  type Certification,
  type PackageDetails,
  type PackageVersion,
} from '@quark/registry';

import { packageCacheKey } from '../lib/storage';
import { useCachedQuery } from './useCachedQuery';

const TIER_RANK: Record<string, number> = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
  TIER_4: 4,
};

export interface CertificationBadge {
  tier: string;
  label: string;
}

/** Highest approved certification, independent of any selected version. */
export function certificationBadge(
  certifications: Certification[] | undefined,
): CertificationBadge | null {
  const approved = (certifications ?? [])
    .filter((item) => item.status === 'approved')
    .sort((a, b) => (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0));
  const best = approved[0];
  return best ? { tier: best.tier, label: `Certified ${best.tier}` } : null;
}

export interface PackageDetailsViewOptions {
  initialVersion?: string;
  onVersionChange?: (version: string) => void;
  ttlMs?: number;
}

export interface UsePackageDetailsViewReturn {
  packageName: string;
  detail: PackageDetails | null;
  loading: boolean;
  error: unknown;
  notFound: boolean;
  refetch: () => void;
  versions: PackageVersion[];
  latestVersion: string | null;
  selectedVersion: string;
  setSelectedVersion: (version: string) => void;
  selectedCertifications: Certification[];
  badge: CertificationBadge | null;
  canEdit: boolean;
  requestedVersion: string;
  versionNotFound: boolean;
}

export function usePackageDetailsView(
  packageName: string,
  options: PackageDetailsViewOptions = {},
): UsePackageDetailsViewReturn {
  const client = useRegistryClient();
  const load = useCallback(
    () => client.Packages.get<PackageDetails>(packageName),
    [client, packageName],
  );
  const {
    data: detail,
    error,
    loading,
    refetch,
  } = useCachedQuery(
    packageCacheKey(packageName),
    load,
    !!packageName,
    options.ttlMs,
  );

  const versions = useMemo(
    () => sortVersions(detail?.versions ?? []),
    [detail],
  );
  const latestVersion = versions[0]?.version ?? null;
  const versionStrings = useMemo(
    () => versions.map((version) => version.version),
    [versions],
  );

  const [requested, setRequested] = useState<string>(
    options.initialVersion ?? '',
  );

  const requestedExists =
    requested !== '' && versionStrings.includes(requested);
  const versionNotFound =
    requested !== '' && versions.length > 0 && !requestedExists;

  const selectedVersion = requestedExists
    ? requested
    : versionNotFound
      ? ''
      : (latestVersion ?? '');

  const setSelectedVersion = useCallback(
    (version: string) => {
      setRequested(version);
      options.onVersionChange?.(version);
    },
    [options.onVersionChange],
  );

  const selectedCertifications = useMemo(
    () => certificationsForVersion({ versions }, selectedVersion),
    [versions, selectedVersion],
  );

  const badge = useMemo(() => {
    const latest = highestVersion(versions);
    return certificationBadge(latest?.certifications);
  }, [versions]);

  const notFound = error instanceof ApiError && error.status === 404;

  return {
    packageName,
    detail,
    loading,
    error,
    notFound,
    refetch,
    versions,
    latestVersion,
    selectedVersion,
    setSelectedVersion,
    selectedCertifications,
    badge,
    canEdit: detail?.canEditMetadata ?? false,
    requestedVersion: requested,
    versionNotFound,
  };
}

import type { Certification } from '@quarks.studio/certification';
import { useCallback, useMemo, useState } from 'react';
import { ApiError } from '@quarks.studio/registry/http';
import { useDistributionServices } from './useDistributionServices';
import {
  certificationsForVersion,
  selectPackageVersion,
  sortVersions,
  type PackageDetails,
  type PackageVersion,
} from '../domain/package-details';

import { apiCache, cacheKey } from '../presentation/storage';
import { useCachedQuery } from '@quarks.studio/storage/query';

import {
  certificationBadge,
  type CertificationBadge,
} from '../domain/certification-badge';
export {
  certificationBadge,
  type CertificationBadge,
} from '../domain/certification-badge';

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
  const client = useDistributionServices();
  const load = useCallback(
    async () => (await client.get(packageName)) as PackageDetails,
    [client, packageName],
  );
  const {
    data: detail,
    error,
    loading,
    refetch,
  } = useCachedQuery({
    cache: apiCache,
    key: cacheKey('pkg', packageName),
    load,
    enabled: !!packageName,
    ttlMs: options.ttlMs,
  });

  const versions = useMemo(
    () => sortVersions(detail?.versions ?? []),
    [detail],
  );
  const latestVersion = detail?.latestVersion ?? null;

  const [requested, setRequested] = useState<string>(
    options.initialVersion ?? '',
  );

  const selected = detail ? selectPackageVersion(detail, requested) : null;
  const versionNotFound = requested !== '' && versions.length > 0 && !selected;
  const selectedVersion = selected?.version ?? '';

  const setSelectedVersion = useCallback(
    (version: string) => {
      setRequested(version);
      options.onVersionChange?.(version);
    },
    [options.onVersionChange],
  );

  const selectedCertifications = useMemo(
    () => certificationsForVersion(detail, selectedVersion),
    [detail, selectedVersion],
  );

  const badge = useMemo(() => {
    return certificationBadge(selected?.certifications);
  }, [selected]);

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

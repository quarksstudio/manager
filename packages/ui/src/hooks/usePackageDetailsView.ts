import { useCallback, useMemo, useState } from 'react';
import { ApiError, useRegistryClient } from '@quarks.studio/registry';
import { certificationsForVersion, highestVersion, sortVersions, type Certification, type PackageDetails, type PackageVersion } from '@quarks.studio/distribution';

import { cacheKey } from '../lib/storage';
import { useCachedQuery } from './useCachedQuery';

import {
  certificationBadge,
  type CertificationBadge,
} from '../web/lib/certification';
export {
  certificationBadge,
  type CertificationBadge,
} from '../web/lib/certification';

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
    cacheKey('pkg', packageName),
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

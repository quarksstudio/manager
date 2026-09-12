import { useCallback } from 'react';
import { useRegistryClient, type PackageReadme } from '@quark/registry';

import { readmeCacheKey } from '../lib/storage';
import { useCachedQuery, type CachedQuery } from './useCachedQuery';

export function useReadmeCached(
  name: string,
  version?: string,
  ttlMs?: number,
): CachedQuery<PackageReadme> {
  const client = useRegistryClient();
  const load = useCallback(
    () => client.Packages.getReadme<PackageReadme>(name, version as string),
    [client, name, version],
  );
  return useCachedQuery(
    readmeCacheKey(name, (version as string) ?? ''),
    load,
    !!name && !!version,
    ttlMs,
  );
}

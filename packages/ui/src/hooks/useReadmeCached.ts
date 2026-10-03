import { useCallback } from 'react';
import { useRegistryClient } from '@quarks.studio/registry';
import { type PackageReadme } from '@quarks.studio/distribution';

import { cacheKey } from '../lib/storage';
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
    cacheKey('readme', `${name}@${version}`),
    load,
    !!name && !!version,
    ttlMs,
  );
}

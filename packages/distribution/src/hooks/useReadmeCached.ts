import { useCallback } from 'react';
import { useDistributionServices } from './useDistributionServices';
import { type PackageReadme } from '../domain/package-details';

import { apiCache, cacheKey } from '../presentation/storage';
import { useCachedQuery, type CachedQuery } from '@quarks.studio/storage/query';

export function useReadmeCached(
  name: string,
  version?: string,
  ttlMs?: number,
): CachedQuery<PackageReadme> {
  const client = useDistributionServices();
  const load = useCallback(
    () => client.getReadme(name, version as string),
    [client, name, version],
  );

  return useCachedQuery({
    cache: apiCache,
    key: cacheKey('readme', `${name}@${version}`),
    load,
    enabled: !!name && !!version,
    ttlMs,
  });
}

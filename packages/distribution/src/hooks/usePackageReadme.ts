import { useCallback } from 'react';
import { useQuery, type QueryState } from '@quarks.studio/storage/query';
import { type PackageReadme } from '../domain/package-details';
import { type DistributionServices } from '../presentation/services';
import { useDistributionServices } from './useDistributionServices';
export function usePackageReadme(
  name: string,
  version?: string,
  override?: DistributionServices,
): QueryState<PackageReadme> {
  const client = useDistributionServices(override);
  const load = useCallback(
    () => client.getReadme(name, version as string),
    [client, name, version],
  );
  return useQuery(load, !!name && !!version);
}

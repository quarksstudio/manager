import { useCallback } from 'react';
import { useQuery, type QueryState } from '@quarks.studio/storage/query';
import { type DistributionServices } from '../presentation/services';
import { useDistributionServices } from './useDistributionServices';
export function useFetchPackage<T = Record<string, unknown>>(
  name: string,
  override?: DistributionServices,
): QueryState<T> {
  const client = useDistributionServices(override);
  const load = useCallback(
    async () => (await client.get(name)) as T,
    [client, name],
  );
  return useQuery(load, !!name);
}

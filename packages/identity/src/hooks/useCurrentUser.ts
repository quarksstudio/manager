import { useCallback } from 'react';
import { useQuery, type QueryState } from '@quarks.studio/storage/query';
import { type IdentityServices } from '../presentation/services';
import { useServices } from './useServices';
export function useCurrentUser<T = Record<string, unknown>>(
  override?: IdentityServices,
): QueryState<T> {
  const client = useServices(override);
  const load = useCallback(async () => (await client.me()) as T, [client]);
  return useQuery(load);
}

import { useMemo } from 'react';
import { createHttpContext } from '@quarks.studio/registry/http';
import { createHttpPackageRegistry } from '../http';
export function useDistributionClient(apiBaseUrl: string) {
  return useMemo(
    () => createHttpPackageRegistry(createHttpContext({ baseUrl: apiBaseUrl })),
    [apiBaseUrl],
  );
}

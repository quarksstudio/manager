import { useMemo } from 'react';
import { createConfiguredContext } from '@quarks.studio/config/http';
import { createHttpPackageRegistry } from '../http';
export function useDistributionClient(apiBaseUrl: string) {
  return useMemo(
    () => createHttpPackageRegistry(createConfiguredContext(apiBaseUrl)),
    [apiBaseUrl],
  );
}

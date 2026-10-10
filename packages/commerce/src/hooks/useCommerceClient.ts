import { useMemo } from 'react';
import { createConfiguredContext } from '@quarks.studio/config/http';
import { createHttpCatalog, createHttpBillingGateway } from '../http';
import type { heldTier } from '@quarks.studio/certification';
export function useCommerceClient(apiBaseUrl: string) {
  return useMemo(() => {
    const context = createConfiguredContext(apiBaseUrl);
    return {
      Catalog: createHttpCatalog(context),
      Gateway: createHttpBillingGateway(context),
      Packages: {
        get: (name: string) =>
          context.fetchJson<{
            versions?: Array<{
              version: string;
              certifications?: Parameters<typeof heldTier>[0];
            }>;
          }>(`package/${encodeURIComponent(name)}`),
      },
    };
  }, [apiBaseUrl]);
}

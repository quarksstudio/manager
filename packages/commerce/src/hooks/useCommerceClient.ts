import { useMemo } from 'react';
import { createHttpContext } from '@quarks.studio/registry/http';
import { createHttpCatalog, createHttpBillingGateway } from '../http';
import type { heldTier } from '@quarks.studio/certification';
export function useCommerceClient(apiBaseUrl: string) {
  return useMemo(() => {
    const context = createHttpContext({ baseUrl: apiBaseUrl });
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

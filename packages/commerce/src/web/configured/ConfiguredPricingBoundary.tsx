import { useMemo } from 'react';
import { heldTier } from '@quarks.studio/certification';
import { CommerceProvider } from '../../presentation';
import { CommerceWebProvider } from '../../presentation';
import {
  PricingBoundary as PricingView,
  type PricingBoundaryProps as PricingViewProps,
} from '../containers/PricingBoundary';
import { useCommerceServices } from '../../hooks/useCommerceServices';
import { useCommerceClient } from '../../hooks/useCommerceClient';

export interface ConfiguredPricingBoundaryProps extends Omit<
  PricingViewProps,
  'apiBaseUrl'
> {
  apiBaseUrl: string;
}

export function ConfiguredPricingBoundary({
  apiBaseUrl,
  ...props
}: ConfiguredPricingBoundaryProps) {
  const client = useCommerceClient(apiBaseUrl);
  const commerce = useCommerceServices(apiBaseUrl);
  const pricing = useMemo(
    () => ({
      catalog: client.Catalog,
      listSystems: () => client.Gateway.listSystems(),
      getHeldTier: async (name: string, versionId?: string) => {
        const detail = await client.Packages.get(name);
        return heldTier(
          detail.versions?.find((version) => version.version === versionId)
            ?.certifications,
        );
      },
    }),
    [client],
  );
  return (
    <CommerceProvider services={commerce}>
      <CommerceWebProvider services={pricing}>
        <PricingView {...props} apiBaseUrl={apiBaseUrl} />
      </CommerceWebProvider>
    </CommerceProvider>
  );
}

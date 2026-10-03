import { useMemo } from 'react';
import { heldTier } from '@quarks.studio/certification';
import { registryConfiguration } from '@quarks.studio/config/http';
import { CommerceProvider } from '../presentation';
import { CommerceWebProvider } from '../presentation';
import {
  PlanGrid as PlanGridView,
  TierMatrix as TierMatrixView,
  PaymentSystemButtons as PaymentSystemButtonsView,
  type PlanGridProps,
  type TierMatrixProps,
  type PaymentSystemButtonsProps,
} from './components';
import { BillingBoundary as BillingView } from './BillingBoundary';
import {
  PricingBoundary as PricingView,
  type PricingBoundaryProps as PricingViewProps,
} from './PricingBoundary';
import { useCommerceServices } from '../hooks/useCommerceServices';
import { useCommerceClient } from '../hooks/useCommerceClient';
export interface ConfiguredBillingBoundaryProps {
  apiBaseUrl: string;
}
export function ConfiguredBillingBoundary({
  apiBaseUrl,
}: ConfiguredBillingBoundaryProps) {
  const services = useCommerceServices(apiBaseUrl);
  return (
    <CommerceProvider services={services}>
      <BillingView />
    </CommerceProvider>
  );
}
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
export function ConfiguredPlanGrid(props: PlanGridProps) {
  const services = useCommerceServices(
    props.apiBaseUrl ?? registryConfiguration.registryUrl,
  );
  return (
    <CommerceProvider services={services}>
      <PlanGridView {...props} />
    </CommerceProvider>
  );
}
export function ConfiguredTierMatrix(props: TierMatrixProps) {
  const services = useCommerceServices(
    props.apiBaseUrl ?? registryConfiguration.registryUrl,
  );
  return (
    <CommerceProvider services={services}>
      <TierMatrixView {...props} />
    </CommerceProvider>
  );
}
export function ConfiguredPaymentSystemButtons(
  props: PaymentSystemButtonsProps,
) {
  const services = useCommerceServices(
    props.apiBaseUrl ?? registryConfiguration.registryUrl,
  );
  return (
    <CommerceProvider services={services}>
      <PaymentSystemButtonsView {...props} />
    </CommerceProvider>
  );
}

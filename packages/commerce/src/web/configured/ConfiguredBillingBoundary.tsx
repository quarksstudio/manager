import { CommerceProvider } from '../../presentation';
import { BillingBoundary as BillingView } from '../containers/BillingBoundary';
import { useCommerceServices } from '../../hooks/useCommerceServices';

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

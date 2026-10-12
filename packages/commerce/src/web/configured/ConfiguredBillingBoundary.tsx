import { CommerceProvider } from '../../presentation';
import { BillingBoundary as BillingView } from '../containers/BillingBoundary';
import { useCommerceServices } from '../../hooks/useCommerceServices';
import { QuarkTheme } from '@quarks.studio/web-ui';
import { Card } from 'antd';

export interface ConfiguredBillingBoundaryProps {
  apiBaseUrl: string;
}

export function ConfiguredBillingBoundary({
  apiBaseUrl,
}: ConfiguredBillingBoundaryProps) {
  const services = useCommerceServices(apiBaseUrl);
  return (
    <QuarkTheme>
      <CommerceProvider services={services}>
        <h1 className="mb-6 text-2xl font-semibold">Billing</h1>
        <Card
          title="Historical"
          className="!bg-slate-900 !border-slate-800 mb-16"
        >
          <BillingView />
        </Card>
      </CommerceProvider>
    </QuarkTheme>
  );
}

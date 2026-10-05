import { CommerceProvider } from '../../presentation';
import {
  PaymentSystemButtons as PaymentSystemButtonsView,
  type PaymentSystemButtonsProps,
} from '../containers/PaymentSystemButtons';
import { useCommerceServices } from '../../hooks/useCommerceServices';

export function ConfiguredPaymentSystemButtons(
  props: PaymentSystemButtonsProps,
) {
  const services = useCommerceServices(props.apiBaseUrl);
  return (
    <CommerceProvider services={services}>
      <PaymentSystemButtonsView {...props} />
    </CommerceProvider>
  );
}

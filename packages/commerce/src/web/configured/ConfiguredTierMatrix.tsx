import { CommerceProvider } from '../../presentation';
import {
  TierMatrix as TierMatrixView,
  type TierMatrixProps,
} from '../containers/TierMatrix';
import { useCommerceServices } from '../../hooks/useCommerceServices';

export function ConfiguredTierMatrix(props: TierMatrixProps) {
  const services = useCommerceServices(props.apiBaseUrl);
  return (
    <CommerceProvider services={services}>
      <TierMatrixView {...props} />
    </CommerceProvider>
  );
}

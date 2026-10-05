import { CommerceProvider } from '../../presentation';
import {
  PlanGrid as PlanGridView,
  type PlanGridProps,
} from '../containers/PlanGrid';
import { useCommerceServices } from '../../hooks/useCommerceServices';

export function ConfiguredPlanGrid(props: PlanGridProps) {
  const services = useCommerceServices(props.apiBaseUrl);
  return (
    <CommerceProvider services={services}>
      <PlanGridView {...props} />
    </CommerceProvider>
  );
}

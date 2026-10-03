import { useContext } from 'react';
import {
  type DistributionServices,
  ServicesContext,
} from '../presentation/services';
export function useDistributionServices(
  override?: DistributionServices,
): DistributionServices {
  const services = useContext(ServicesContext);
  if (override) return override;
  if (!services) throw new Error('DistributionProvider is required');
  return services;
}

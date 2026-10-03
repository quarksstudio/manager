import { useContext } from 'react';
import {
  type DistributionWebServices,
  Context,
} from '../presentation/web-services';
export function useDistributionWebServices(): DistributionWebServices {
  const services = useContext(Context);
  if (!services) throw new Error('DistributionWebProvider is required');
  return services;
}

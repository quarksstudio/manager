import { useContext } from 'react';
import {
  type PackageSearchServices,
  ServicesContext,
} from '../presentation/services';
export function useServices(
  override?: PackageSearchServices,
): PackageSearchServices {
  const services = useContext(ServicesContext);
  if (override) return override;
  if (!services) throw new Error('PackageSearchProvider is required');
  return services;
}

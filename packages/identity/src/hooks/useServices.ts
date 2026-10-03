import { useContext } from 'react';
import {
  type IdentityServices,
  ServicesContext,
} from '../presentation/services';
export function useServices(override?: IdentityServices): IdentityServices {
  const services = useContext(ServicesContext);
  if (override) return override;
  if (!services) throw new Error('IdentityProvider is required');
  return services;
}

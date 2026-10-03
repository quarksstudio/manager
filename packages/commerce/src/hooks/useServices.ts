import { useContext } from 'react';
import {
  type CommerceServices,
  ServicesContext,
} from '../presentation/services';
export function useServices(override?: CommerceServices): CommerceServices {
  const services = useContext(ServicesContext);
  if (override) return override;
  if (!services) throw new Error('CommerceProvider is required');
  return services;
}

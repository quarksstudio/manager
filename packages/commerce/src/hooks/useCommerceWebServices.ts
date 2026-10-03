import { useContext } from 'react';
import { type CommerceWebServices, Context } from '../presentation/web';
export function useCommerceWebServices(): CommerceWebServices {
  const services = useContext(Context);
  if (!services) throw new Error('CommerceWebProvider is required');
  return services;
}

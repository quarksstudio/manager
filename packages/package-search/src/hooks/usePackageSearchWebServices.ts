import { useContext } from 'react';
import {
  type PackageSearchWebServices,
  Context,
} from '../presentation/web-services';
export function usePackageSearchWebServices(): PackageSearchWebServices {
  const services = useContext(Context);
  if (!services) throw new Error('PackageSearchWebProvider is required');
  return services;
}

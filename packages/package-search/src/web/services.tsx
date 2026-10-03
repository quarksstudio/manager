import { createContext, useContext, type ReactNode } from 'react';
export interface PackageSearchWebServices {
  search(): Promise<{ items: Array<{ id: string }> }>;
}
const Context = createContext<PackageSearchWebServices | null>(null);
export function PackageSearchWebProvider({ services, children }: { services: PackageSearchWebServices; children: ReactNode }) {
  return <Context.Provider value={services}>{children}</Context.Provider>;
}
export function usePackageSearchWebServices(): PackageSearchWebServices {
  const services = useContext(Context);
  if (!services) throw new Error('PackageSearchWebProvider is required');
  return services;
}

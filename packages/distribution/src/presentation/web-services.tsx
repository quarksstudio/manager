import { createContext, type ReactNode } from 'react';
import type { PackageDetails } from '../index';
export interface DistributionWebServices {
  get(name: string): Promise<PackageDetails>;
}
export const Context = createContext<DistributionWebServices | null>(null);
export function DistributionWebProvider({
  services,
  children,
}: {
  services: DistributionWebServices;
  children: ReactNode;
}) {
  return <Context.Provider value={services}>{children}</Context.Provider>;
}

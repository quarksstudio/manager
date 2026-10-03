import { createContext, type ReactNode } from 'react';
import type { PackageDetails, PackageReadme } from '../index';
export interface DistributionWebServices {
  get(name: string): Promise<PackageDetails>;
  getReadme(name: string, version: string): Promise<PackageReadme>;
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

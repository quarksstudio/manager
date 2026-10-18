import { createContext, type ReactNode } from 'react';
import type { PackageDetails } from '../index';
import type { AvatarUserLoader } from '@quarks.studio/web-ui';
export interface DistributionWebServices {
  get(name: string): Promise<PackageDetails>;
  getUsers?: AvatarUserLoader;
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

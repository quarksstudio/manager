import { createContext, type ReactNode } from 'react';
export interface PackageSearchWebServices {
  search(): Promise<{ items: Array<{ id: string }> }>;
}
export const Context = createContext<PackageSearchWebServices | null>(null);
export function PackageSearchWebProvider({
  services,
  children,
}: {
  services: PackageSearchWebServices;
  children: ReactNode;
}) {
  return <Context.Provider value={services}>{children}</Context.Provider>;
}

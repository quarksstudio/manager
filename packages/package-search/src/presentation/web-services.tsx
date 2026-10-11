import { createContext, type ReactNode } from 'react';
import type { PackageDetails } from "@quarks.studio/registry/domain";

export interface Stats {
  mostView: PackageDetails[];
  mostDownload: PackageDetails[];
  lastUpdate: PackageDetails[];
}

export interface PackageSearchWebServices {
  search(): Promise<{ items: Array<PackageDetails> }>;
  home(): Promise<Stats>;
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

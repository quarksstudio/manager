import { createContext, type ReactNode } from 'react';
import type { CatalogRemote, PaymentSystems } from '../index';
export interface CommerceWebServices {
  catalog: CatalogRemote;
  listSystems(): Promise<PaymentSystems>;
  getHeldTier(packageName: string, versionId?: string): Promise<number>;
}
export const Context = createContext<CommerceWebServices | null>(null);
export function CommerceWebProvider({
  services,
  children,
}: {
  services: CommerceWebServices;
  children: ReactNode;
}) {
  return <Context.Provider value={services}>{children}</Context.Provider>;
}

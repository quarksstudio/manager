import { createContext, createElement, type ReactNode } from 'react';
import type { createAuditCertification } from '../application/audit-decision';
export type CertificationServices = Pick<
  ReturnType<typeof createAuditCertification>,
  'registerAuditorPasskey' | 'signAuditDecision'
>;
export const ServicesContext = createContext<CertificationServices | null>(
  null,
);
export function CertificationProvider({
  services,
  children,
}: {
  services: CertificationServices;
  children: ReactNode;
}) {
  return createElement(ServicesContext.Provider, { value: services }, children);
}

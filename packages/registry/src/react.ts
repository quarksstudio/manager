import { CertificationProvider } from '@quarks.studio/certification/react';
import {
  registerAuditorPasskey,
  signAuditDecision,
} from './composition/ambient-certification';
const certificationServices = { registerAuditorPasskey, signAuditDecision };
import { createElement, useMemo, type ReactNode } from 'react';
import { IdentityProvider } from '@quarks.studio/identity/react';
import { DistributionProvider } from '@quarks.studio/distribution/react';
import { PackageSearchProvider } from '@quarks.studio/package-search/react';
import { CommerceProvider } from '@quarks.studio/commerce/react';
import { createPresentationServices } from './composition/presentation-services';
export function RegistryProvider({ children }: { children: ReactNode }) {
  const services = useMemo(createPresentationServices, []);
  return createElement(IdentityProvider, {
    services: services.identity,
    children: createElement(DistributionProvider, {
      services: services.distribution,
      children: createElement(PackageSearchProvider, {
        services: services.search,
        children: createElement(CommerceProvider, {
          services: services.commerce,
          children: createElement(CertificationProvider, {
            services: certificationServices,
            children,
          }),
        }),
      }),
    }),
  });
}

export { useAuthLogin, useAuthLogout, usePaymentLink } from './hooks';

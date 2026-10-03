import { Client } from './ambient-client';
import { createRegistryClient } from '../client';
import { loginWithProvider, submitManualLoginCode } from './ambient-login';
import { searchPackages, fetchRemotePackages } from './ambient-search';
import { createConfigSessionRepository } from '@quarks.studio/identity/http';
import type { IdentityServices } from '@quarks.studio/identity/react';
import type { DistributionServices } from '@quarks.studio/distribution/react';
import type { CommerceServices } from '@quarks.studio/commerce/react';
export function createPresentationServices() {
  const client = new Client();
  return {
    identity: {
      loginWithProvider,
      submitManualLoginCode,
      me: client.Auth.me.bind(client.Auth),
      logout: client.Auth.logout.bind(client.Auth),
      clearSession: () => createConfigSessionRepository().clear(),
    } satisfies IdentityServices,
    distribution: client.Packages satisfies DistributionServices,
    search: { searchPackages, fetchRemotePackages },
    commerce: {
      createPaymentLink: (system, target, baseUrl) =>
        baseUrl
          ? createRegistryClient({ baseUrl }).Gateway.createPaymentLink(
              system,
              target,
            )
          : client.Gateway.createPaymentLink(system, target),
      listPayments: (options) => client.Gateway.listPayments(options),
    } as CommerceServices,
  };
}

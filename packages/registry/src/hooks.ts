import type { PackageReadme } from '@quarks.studio/distribution';
import type { PaymentLinkTarget } from '@quarks.studio/commerce';
import { useMemo } from 'react';
import { Client } from './composition/ambient-client';
import {
  loginWithProvider,
  submitManualLoginCode,
} from './composition/ambient-login';
import {
  searchPackages,
  fetchRemotePackages,
} from './composition/ambient-search';
import { createConfigSessionRepository } from '@quarks.studio/identity/http';
import { createRegistryClient } from './client';
import * as identity from '@quarks.studio/identity/react';
import * as distribution from '@quarks.studio/distribution/react';
import * as search from '@quarks.studio/package-search/react';
import * as commerce from '@quarks.studio/commerce/react';
import type { SearchFilters } from '@quarks.studio/package-search';
export type { RegistryQuery } from '@quarks.studio/types/query';
export type { UseAuthLoginReturn } from '@quarks.studio/identity/react';
export type {
  UsePackageCertificationsReturn,
  UseUpdatePackageMetadataReturn,
} from '@quarks.studio/distribution/react';
export type { UseSearchPackagesReturn } from '@quarks.studio/package-search/react';
export type {
  UsePaymentLinkOptions,
  UsePaymentLinkReturn,
} from '@quarks.studio/commerce/react';
interface RegistryPackages {
  search(query?: string): Promise<Array<[string, string]>>;
  get<T = Record<string, unknown>>(name: string): Promise<T>;
  getReadme<T = PackageReadme>(name: string, version: string): Promise<T>;
  downloadBundle(name: string, version: string): Promise<Response>;
  update(body: Record<string, unknown>, isNew?: boolean): Promise<unknown>;
}

interface RegistryAuth {
  me<T = Record<string, unknown>>(): Promise<T>;
  logout(): Promise<unknown>;
}

interface RegistryGateway {
  createPaymentLink(
    system: string,
    target: PaymentLinkTarget,
  ): Promise<{ url: string }>;
}

export interface RegistryClient {
  Packages: RegistryPackages;
  Auth: RegistryAuth;
  Gateway: RegistryGateway;
}

export function useRegistryClient(): RegistryClient {
  return useMemo(() => new Client() as unknown as RegistryClient, []);
}
function useIdentityServices(): identity.IdentityServices {
  const client = useRegistryClient();
  return useMemo(
    () => ({
      loginWithProvider,
      submitManualLoginCode,
      me: client.Auth.me.bind(client.Auth),
      logout: client.Auth.logout.bind(client.Auth),
      clearSession: () => createConfigSessionRepository().clear(),
    }),
    [client],
  );
}
export function useAuthLogin() {
  return identity.useAuthLogin(useIdentityServices());
}
export function useAuthLogout() {
  return identity.useAuthLogout(useIdentityServices());
}
export function useCurrentUser<T = Record<string, unknown>>() {
  return identity.useCurrentUser<T>(useIdentityServices());
}
export function useFetchPackage<T = Record<string, unknown>>(name: string) {
  return distribution.useFetchPackage<T>(
    name,
    useRegistryClient()
      .Packages as unknown as distribution.DistributionServices,
  );
}
export function usePackageReadme(name: string, version?: string) {
  return distribution.usePackageReadme(
    name,
    version,
    useRegistryClient()
      .Packages as unknown as distribution.DistributionServices,
  );
}
export function usePackageCertifications(name: string, version?: string) {
  return distribution.usePackageCertifications(
    name,
    version,
    useRegistryClient()
      .Packages as unknown as distribution.DistributionServices,
  );
}
export function useUpdatePackageMetadata() {
  return distribution.useUpdatePackageMetadata(
    useRegistryClient()
      .Packages as unknown as distribution.DistributionServices,
  );
}
const searchServices = { searchPackages, fetchRemotePackages };
export function useSearchPackages(filters: SearchFilters = {}) {
  return search.useSearchPackages(filters, searchServices);
}
export function usePaymentLink(options: commerce.UsePaymentLinkOptions = {}) {
  const client = useRegistryClient();
  const services = useMemo<commerce.CommerceServices>(
    () => ({
      createPaymentLink: (system, target, baseUrl) =>
        baseUrl
          ? createRegistryClient({ baseUrl }).Gateway.createPaymentLink(
              system,
              target,
            )
          : client.Gateway.createPaymentLink(system, target),
      listPayments: (options) => new Client().Gateway.listPayments(options),
    }),
    [client],
  );
  return commerce.usePaymentLink(options, services);
}

export function usePayments(options: { limit?: number } = {}) {
  const client = useMemo(() => new Client(), []);
  const services = useMemo<commerce.CommerceServices>(
    () => ({
      createPaymentLink: (system, target) =>
        client.Gateway.createPaymentLink(system, target),
      listPayments: (options) => client.Gateway.listPayments(options),
    }),
    [client],
  );
  return commerce.usePayments(options, services);
}
export type { UsePaymentsReturn } from '@quarks.studio/commerce/react';

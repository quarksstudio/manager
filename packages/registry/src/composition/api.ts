import { createHttpBillingGateway } from '@quarks.studio/commerce/http';
import { createHttpCatalog } from '@quarks.studio/commerce/http';
import { createHttpIdentityGateway } from '@quarks.studio/identity/http';
import { createHttpPackageRegistry } from '@quarks.studio/distribution/http';
import type { OperationContext } from '../transport/http-context';
import type { BillingGateway } from '@quarks.studio/commerce';
import type { CatalogRemote } from '@quarks.studio/commerce';
import type { IdentityGateway } from '@quarks.studio/identity';
import type { PackageRegistry } from '@quarks.studio/distribution';
import type { SearchResult } from '@quarks.studio/distribution';
import type {
  PackageDetails,
  PackageReadme,
} from '@quarks.studio/distribution';
import type {
  CreateVersionInput,
  UpdatePackageInput,
} from '@quarks.studio/distribution';
import type { AuthSession } from '@quarks.studio/identity';
import type { CurrentUser } from '@quarks.studio/identity';
import type {
  CreateSubscriptionInput,
  CreatedSubscription,
  ExecutePaymentInput,
  PaymentExecution,
  PaymentLink,
  PaymentMethodTokenInput,
  SubscriptionCancelResult,
  SubscriptionRecord,
  TokenizedPaymentMethod,
} from '@quarks.studio/commerce';

/**
 * The stable shape every consumer already talks to. The groups are named here
 * rather than assembled by reflection, so a new operation shows up in the type
 * instead of silently disappearing behind `{}`.
 */
export interface RegistryApi {
  Auth: IdentityGateway;
  Packages: PackageRegistry;
  Gateway: BillingGateway;
  Catalog: CatalogRemote;
}

/** Kept as named aliases: both subpath entrypoints re-export them. */
export type AuthApi = RegistryApi['Auth'];
export type PackagesApi = RegistryApi['Packages'];
export type GatewayApi = RegistryApi['Gateway'];
export type CatalogApi = RegistryApi['Catalog'];

export type {
  CreateSubscriptionInput,
  CreatedSubscription,
  CreateVersionInput,
  CurrentUser,
  ExecutePaymentInput,
  PaymentExecution,
  PaymentLink,
  PaymentMethodTokenInput,
  SearchResult,
  SubscriptionCancelResult,
  SubscriptionRecord,
  TokenizedPaymentMethod,
  UpdatePackageInput,
  AuthSession,
  PackageDetails,
  PackageReadme,
};

/**
 * The composition root: one transport in, the bounded contexts' ports out. It
 * knows which adapter implements which port and nothing else, so swapping a
 * transport never reaches a use case.
 */
export function createApi(context: OperationContext): RegistryApi {
  return {
    Auth: createHttpIdentityGateway(context),
    Packages: createHttpPackageRegistry(context),
    Gateway: createHttpBillingGateway(context),
    Catalog: createHttpCatalog(context),
  };
}

import { createHttpBillingGateway } from '../billing/infrastructure/http-billing-gateway';
import { createHttpIdentityGateway } from '../identity/infrastructure/http-identity-gateway';
import { createHttpPackageRegistry } from '../distribution/infrastructure/http-package-registry';
import type { OperationContext } from '../transport/http-context';
import type { BillingGateway } from '../billing/application/billing.port';
import type { IdentityGateway } from '../identity/application/identity.port';
import type { PackageRegistry } from '../distribution/application/package-registry.port';
import type { SearchResult } from '../distribution/application/package-registry.port';
import type { PackageDetails, PackageReadme } from '../distribution/domain/package-details';
import type { CreateVersionInput, UpdatePackageInput } from '../distribution/application/package-registry.port';
import type { AuthSession } from '../identity/domain/auth-session';
import type { CurrentUser } from '../identity/domain/auth-session';
import type {
  CreateSubscriptionInput,
  ExecutePaymentInput,
  PaymentExecution,
  PaymentMethodTokenInput,
  Subscription,
  TokenizedPaymentMethod,
} from '../billing/domain/billing';

/**
 * The stable shape every consumer already talks to. The groups are named here
 * rather than assembled by reflection, so a new operation shows up in the type
 * instead of silently disappearing behind `{}`.
 */
export interface RegistryApi {
  Auth: IdentityGateway;
  Packages: PackageRegistry;
  Gateway: BillingGateway;
}

/** Kept as named aliases: both subpath entrypoints re-export them. */
export type AuthApi = RegistryApi['Auth'];
export type PackagesApi = RegistryApi['Packages'];
export type GatewayApi = RegistryApi['Gateway'];

export type {
  CreateSubscriptionInput,
  CreateVersionInput,
  CurrentUser,
  ExecutePaymentInput,
  PaymentExecution,
  PaymentMethodTokenInput,
  SearchResult,
  Subscription,
  TokenizedPaymentMethod,
  UpdatePackageInput,
  AuthSession,
  PackageDetails,
  PackageReadme,
};

/**
 * The composition root: one transport in, the three bounded contexts' ports
 * out. It knows which adapter implements which port and nothing else, so
 * swapping a transport never reaches a use case.
 */
export function createApi(context: OperationContext): RegistryApi {
  return {
    Auth: createHttpIdentityGateway(context),
    Packages: createHttpPackageRegistry(context),
    Gateway: createHttpBillingGateway(context),
  };
}

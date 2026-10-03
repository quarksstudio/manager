import { createApi, type RegistryApi } from './composition/api';
import { createHttpIdentityGateway } from '@quarks.studio/identity/http';
import {
  createHttpContext,
  RegistryHttpError,
  type HttpContext,
  type RegistryCache,
  type RegistryRequestOptions,
} from './transport/http-context';
import type { AuthSession } from '@quarks.studio/identity';

export * from '@quarks.studio/distribution';
export { AUTH_MESSAGE } from '@quarks.studio/identity';
export {
  ApiError,
  RegistryHttpError,
  createHttpContext,
  type CachedResponse,
  type HttpContext,
  type OperationContext,
  type RegistryCache,
  type RegistryRequestOptions,
} from './transport/http-context';
export {
  DEFAULT_CACHE_TTL_MS,
  createStorageCache,
  type StorageCacheOptions,
} from './transport/storage-cache';
export type {
  AuthApi,
  CatalogApi,
  GatewayApi,
  PackagesApi,
  RegistryApi,
} from './composition/api';
export type { AuthSession };

export { browsePlans, browseTierLadder } from '@quarks.studio/commerce';
export type { CatalogRemote } from '@quarks.studio/commerce';
export {
  isPlanProduct,
  isTierProduct,
  tierName,
  type CatalogProduct,
  type ProductKind,
} from '@quarks.studio/commerce';
export { formatPrice } from '@quarks.studio/commerce';
export {
  hasTierOverlap,
  isPurchasable,
  sortByPrice,
  type TierOffer,
} from '@quarks.studio/commerce';
export {
  partitionPlanSystems,
  planSignupNote,
  type PaymentSystem,
  type PaymentSystems,
  type PendingSystem,
  type PlanSystems,
} from '@quarks.studio/commerce';
export {
  paymentLinkPath,
  type PaymentLinkRequest,
  type PaymentLinkTarget,
} from '@quarks.studio/commerce';
export {
  paymentLinkFailure,
  type PaymentLinkFailure,
} from '@quarks.studio/commerce';
export { heldTier } from '@quarks.studio/certification';
export type {
  CreatedSubscription,
  PaymentLink,
  SubscriptionCancelResult,
  SubscriptionRecord,
} from '@quarks.studio/commerce';

export interface RegistryClientOptions {
  baseUrl: string;
  token?: string;
  fetch?: typeof fetch;
  /**
   * Off by default: a request-scoped client exists to answer one request, not
   * to replay a response someone else stored. Pass a cache to opt in.
   */
  cache?: RegistryCache;
}

export interface RegistryClient extends RegistryApi {
  signInWithPassword: (input: {
    endpoint: string;
    email: string;
    password: string;
  }) => Promise<AuthSession>;
  /** Escape hatch for routes the typed groups do not cover. */
  _request: (
    path: string,
    options?: RegistryRequestOptions,
  ) => Promise<Response>;
  _fetch: <T = unknown>(
    path: string,
    options?: RegistryRequestOptions,
  ) => Promise<T>;
}

/**
 * Request-scoped transport: the base URL, the token, the cache and the 401
 * behaviour are all given by the caller. Nothing is read from global
 * configuration or browser storage, so this is the client a server renderer
 * must use.
 */
export function createRegistryClient(
  options: RegistryClientOptions,
): RegistryClient {
  const transport = options.fetch ?? globalThis.fetch;
  const context: HttpContext = createHttpContext({
    baseUrl: options.baseUrl,
    token: options.token,
    fetch: options.fetch,
    cache: options.cache,
  });

  return {
    ...createApi(context),
    async signInWithPassword({ endpoint, email, password }) {
      const response = await transport(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
        cache: 'no-store',
      });
      if (!response.ok)
        throw new RegistryHttpError(response.status, 'Sign in failed');
      const identity = await response.json();
      if (typeof identity.idToken !== 'string')
        throw new RegistryHttpError(502, 'Missing identity token');
      return createHttpIdentityGateway(context).exchange(identity.idToken);
    },
    _request: (path, requestOptions) => context.request(path, requestOptions),
    _fetch: (path, requestOptions) => context.fetchJson(path, requestOptions),
  };
}

export type {
  PaymentRecord,
  PaymentPage,
  PaymentListOptions,
} from '@quarks.studio/commerce';

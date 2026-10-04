import {
  createHttpContext,
  type HttpContext,
  type RegistryCache,
} from '@quarks.studio/registry/http';
import {
  createHttpIdentityGateway,
  createHttpPublicUsers,
  createPasswordSignIn,
} from '@quarks.studio/identity/http';
import { createHttpPackageRegistry } from '@quarks.studio/distribution/http';
import {
  createHttpBillingGateway,
  createHttpCatalog,
} from '@quarks.studio/commerce/http';
import { createHttpPackageSearch } from '@quarks.studio/package-search/http';

export interface AppApiOptions {
  baseUrl: string;
  token?: string;
  fetch?: typeof fetch;
  /**
   * Off by default: a request-scoped client exists to answer one request, not
   * to replay a response someone else stored. Pass a cache to opt in.
   */
  cache?: RegistryCache;
}

export function createAppApi(options: AppApiOptions) {
  const transport = options.fetch ?? globalThis.fetch;
  const context: HttpContext = createHttpContext({
    baseUrl: options.baseUrl,
    token: options.token,
    fetch: options.fetch,
    cache: options.cache,
  });

  return {
    Auth: createHttpIdentityGateway(context),
    Users: createHttpPublicUsers(context),
    Search: createHttpPackageSearch(context),
    Packages: createHttpPackageRegistry(context),
    Gateway: createHttpBillingGateway(context),
    Catalog: createHttpCatalog(context),
    signInWithPassword: createPasswordSignIn(
      createHttpIdentityGateway(context),
      transport,
    ),
  };
}

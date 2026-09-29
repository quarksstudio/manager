import { createApi, type RegistryApi } from './api';
import { createGlobalContext } from './ambient-context';
import { registryConfiguration } from './registry-configuration';
import type {
  OperationContext,
  RegistryRequestOptions,
} from '../transport/http-context';

export type { AuthApi, GatewayApi, PackagesApi, RegistryApi } from './api';

/**
 * The implicit client: it reads the base URL from the configuration and the
 * bearer token from the constructor, and it caches reads. Prefer
 * `createRegistryClient` from `../client` when the values can be passed
 * explicitly.
 */
export class Client {
  /** Resolved from the configuration; override with `QUARK_REGISTRY_URL`. */
  static get API(): string {
    return registryConfiguration.registryUrl;
  }
  static version = '1.0.0';

  private token = '';

  public Auth: RegistryApi['Auth'];
  public Packages: RegistryApi['Packages'];
  public Gateway: RegistryApi['Gateway'];

  constructor(token = '') {
    this.token = token;
    const api = createApi(this._lazyContext());
    this.Auth = api.Auth;
    this.Packages = api.Packages;
    this.Gateway = api.Gateway;
  }

  _request(url: string, options: RegistryRequestOptions = {}) {
    return this._context().then((context) => context.request(url, options));
  }

  _fetch<T = unknown>(url: string, options: RegistryRequestOptions = {}) {
    return this._context().then((context) =>
      context.fetchJson<T>(url, options),
    );
  }

  _headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Version': Client.version,
      'X-Client': Client.name,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Resolved on every call, not at construction: the base URL is a live read of
   * the configuration, so an override applied later still takes effect. A client
   * with no token falls back to the stored session.
   */
  private _context() {
    return createGlobalContext({
      baseUrl: Client.API,
      headers: this._headers(),
    });
  }

  /** The synchronous view the ports are bound to. */
  private _lazyContext(): OperationContext {
    return {
      baseUrl: Client.API,
      request: (path, options) =>
        this._context().then((context) => context.request(path, options)),
      fetchJson: (path, options) =>
        this._context().then((context) => context.fetchJson(path, options)),
    };
  }
}

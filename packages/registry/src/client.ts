import * as operations from './lib/Packages';
import type {
  PackageDetails,
  PackageReadme,
  UpdatePackageMetadataInput,
} from './package-details';
export * from './package-details';

export class RegistryHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RegistryHttpError';
  }
}
export interface RegistryClientOptions {
  baseUrl: string;
  token?: string;
  fetch?: typeof fetch;
}
/** Request-scoped transport: no global configuration, browser storage or cache. */
export function createRegistryClient(options: RegistryClientOptions) {
  const base = options.baseUrl.replace(/\/$/, '');
  const transport = options.fetch ?? globalThis.fetch;
  const context = {
    async _request(
      path: string,
      init: Record<string, any> = {},
    ): Promise<Response> {
      const headers = new Headers(init['headers']);
      if (options.token)
        headers.set('Authorization', `Bearer ${options.token}`);
      let body = init['body'];
      if (body && typeof body !== 'string' && !(body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(body);
      }
      const response = await transport(`${base}/${path}`, {
        ...init,
        body,
        headers,
        cache: 'no-store',
      });
      if (!response.ok)
        throw new RegistryHttpError(
          response.status,
          `Registry request failed (${response.status})`,
        );
      return response;
    },
    async _fetch(path: string, init?: Record<string, any>) {
      const response = await this._request(path, init);
      return response.status === 204 ? undefined : response.json();
    },
  };
  return {
    Packages: {
      get: (name: string): Promise<PackageDetails> =>
        operations.get.call(context, name),
      search: (query = ''): Promise<{ items: Array<{ id: string }> }> =>
        operations.search.call(context, query),
      getReadme: (name: string, version: string): Promise<PackageReadme> =>
        operations.getReadme.call(context, name, version),
      downloadBundle: (name: string, version: string) =>
        operations.downloadBundle.call(context, name, version),
      update: (input: UpdatePackageMetadataInput): Promise<PackageDetails> =>
        operations.update.call(context, input as any),
    },
    Auth: {
      async signInWithPassword(input: {
        endpoint: string;
        email: string;
        password: string;
      }): Promise<{ accessToken: string }> {
        const response = await transport(input.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: input.email,
            password: input.password,
            returnSecureToken: true,
          }),
          cache: 'no-store',
        });
        if (!response.ok)
          throw new RegistryHttpError(response.status, 'Sign in failed');
        const identity = await response.json();
        if (typeof identity.idToken !== 'string')
          throw new RegistryHttpError(502, 'Missing identity token');
        return context._fetch('auth/exchange', {
          method: 'POST',
          body: { token: identity.idToken },
        });
      },
      me: (): Promise<{ id?: string; uid?: string }> =>
        context._fetch('auth/me'),
      exchange: (token: string): Promise<{ accessToken: string }> =>
        context._fetch('auth/exchange', { method: 'POST', body: { token } }),
      logout: () => context._fetch('auth/logout', { method: 'POST' }),
    },
  };
}

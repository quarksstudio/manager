import { RegistryHttpError } from '@quarks.studio/registry/http';
import type { IdentityGateway } from '../application/identity.port';
export function createPasswordSignIn(
  gateway: Pick<IdentityGateway, 'exchange'>,
  transport: typeof fetch = globalThis.fetch,
) {
  return async function signInWithPassword({
    endpoint,
    email,
    password,
  }: {
    endpoint: string;
    email: string;
    password: string;
  }) {
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
    return gateway.exchange(identity.idToken);
  };
}

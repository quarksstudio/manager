import type { OperationContext } from '../../transport/http-context';
import type { AuthSession, CurrentUser } from '../domain/auth-session';
import type { IdentityGateway } from '../application/identity.port';

/**
 * The `auth` namespace of the registry. `exchange` is the single token
 * exchange: everything that holds a provider token — the CLI, the OAuth popup,
 * the local emulator — goes through it.
 */
export function createHttpIdentityGateway(
  context: OperationContext,
): IdentityGateway {
  return {
    exchange: (token, refreshToken): Promise<AuthSession> =>
      context.fetchJson('auth/exchange', {
        method: 'POST',
        body: refreshToken ? { token, refreshToken } : { token },
      }),

    me: (): Promise<CurrentUser> => context.fetchJson('auth/me'),

    logout: (): Promise<unknown> =>
      context.fetchJson('auth/logout', { method: 'POST' }),
  };
}

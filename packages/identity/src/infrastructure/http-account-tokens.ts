import { createConfiguredContext } from '@quarks.studio/config/http';
import type { PersonalAccessToken } from '../domain/account-dashboard';

function normalize(raw: Record<string, unknown>): PersonalAccessToken {
  const scope = raw['scope'];
  return {
    id: typeof raw['id'] === 'string' ? raw['id'] : '',
    name: typeof raw['name'] === 'string' ? raw['name'] : '',
    tokenPrefix:
      typeof raw['tokenPrefix'] === 'string' ? raw['tokenPrefix'] : '',
    scope:
      scope === 'publish-packages' || scope === 'audit-access'
        ? scope
        : 'read-only',
    createdAt: typeof raw['createdAt'] === 'string' ? raw['createdAt'] : '',
    lastUsedAt:
      typeof raw['lastUsedAt'] === 'string' ? raw['lastUsedAt'] : null,
    expiresAt: typeof raw['expiresAt'] === 'string' ? raw['expiresAt'] : '',
    isRevoked: raw['isRevoked'] === true,
  };
}

/**
 * Real adapter for the tokens registry. Reads and revokes the credentials
 * registered under `auth/tokens` through the ambient configured transport, so
 * the browser session bearer is applied. There is no create route: a token is
 * registered by the exchange that authenticates its client.
 */
export function createHttpAccountTokens(apiBaseUrl?: string) {
  const context = createConfiguredContext(apiBaseUrl);
  return {
    list: async (): Promise<PersonalAccessToken[]> => {
      const response = await context.fetchJson<{ tokens?: unknown[] }>(
        'auth/tokens',
      );
      const tokens = Array.isArray(response?.tokens) ? response.tokens : [];
      return tokens
        .filter(
          (token): token is Record<string, unknown> =>
            !!token && typeof token === 'object',
        )
        .map(normalize);
    },
    revoke: async (tokenId: string): Promise<void> => {
      await context.fetchJson(`auth/tokens/${encodeURIComponent(tokenId)}`, {
        method: 'DELETE',
      });
    },
  };
}

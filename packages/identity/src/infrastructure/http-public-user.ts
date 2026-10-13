import type { OperationContext } from '@quarks.studio/registry/http';
import type { PublicUserProfile } from '../domain/public-user-profile';

export function createHttpPublicUsers(context: OperationContext) {
  return {
    update: (username: string): Promise<PublicUserProfile> =>
      context.fetchJson('auth/me', { method: 'POST', body: { username } }),
    get: (username: string): Promise<PublicUserProfile> =>
      context.fetchJson(`users/${encodeURIComponent(username)}`),
  };
}

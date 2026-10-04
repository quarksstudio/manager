import { createConfiguredContext } from '@quarks.studio/config/http';
import { createHttpPublicUsers } from './http-public-user';
import { createHttpPackageSearch } from '@quarks.studio/package-search/http';
import { persistProfileIdentity } from './profile-session';
import type { UserProfileServices } from '../application/user-profile.port';

export const userPackagePageSize = 24;

export function userProfileServices(apiBaseUrl?: string): UserProfileServices {
  const context = createConfiguredContext(apiBaseUrl);
  const users = createHttpPublicUsers(context);
  return {
    getProfile: users.get,
    updateUsername: async (username) => {
      const profile = await users.update(username);
      await persistProfileIdentity(profile);
      return profile;
    },
    getPackages: (uid, cursor) =>
      createHttpPackageSearch(context).search(
        { author: uid },
        { limit: userPackagePageSize },
        cursor,
      ),
  };
}

import type { PublicUserProfile } from '../domain/public-user-profile';
import type { RemoteSearchPage } from '@quarks.studio/package-search';

export interface UserProfileServices {
  getProfile(username: string): Promise<PublicUserProfile>;
  getPackages(uid: string, cursor?: string): Promise<RemoteSearchPage>;
  updateUsername(username: string): Promise<PublicUserProfile>;
}

import type { PublicUserProfile } from '../domain/public-user-profile';
export interface UserSettings extends PublicUserProfile {
  displayName: string;
}
export type UserSettingsChanges = Partial<
  Pick<UserSettings, 'username' | 'displayName'>
>;
export interface UserSettingsServices {
  get(): Promise<UserSettings>;
  update(changes: UserSettingsChanges): Promise<UserSettings>;
}

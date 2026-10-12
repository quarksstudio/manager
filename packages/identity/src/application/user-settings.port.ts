import type { PublicUserProfile } from '../domain/public-user-profile';
export interface UserSettings extends PublicUserProfile {
  displayName: string;
  email?: string | null;
  linkedEmails?: string[];
  publicEmail?: string | null;
}
export type UserSettingsChanges = Partial<
  Pick<
    UserSettings,
    'username' | 'displayName' | 'linkedEmails' | 'publicEmail'
  >
>;
export interface EmailAvailability {
  email: string;
  available: boolean;
}
export interface UserSettingsServices {
  get(): Promise<UserSettings>;
  update(changes: UserSettingsChanges): Promise<UserSettings>;
  checkEmail(email: string): Promise<EmailAvailability>;
}

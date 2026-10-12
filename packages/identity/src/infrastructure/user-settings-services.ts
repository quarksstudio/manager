import { createConfiguredContext } from '@quarks.studio/config/http';
import { persistProfileIdentity } from './profile-session';
import type {
  UserSettingsServices,
  UserSettings,
} from '../application/user-settings.port';

export function userSettingsServices(
  apiBaseUrl?: string,
): UserSettingsServices {
  const context = createConfiguredContext(apiBaseUrl);
  return {
    get: () => context.fetchJson<UserSettings>('auth/me'),
    update: async (changes) => {
      const profile = await context.fetchJson<UserSettings>('auth/me', {
        method: 'POST',
        body: changes,
      });
      const updated = { ...profile, ...changes };
      await persistProfileIdentity(updated);
      return updated;
    },
    checkEmail: async (email) => {
      const result = await context.fetchJson<{
        email?: string;
        available?: boolean;
      }>('auth/emails/check', {
        method: 'POST',
        body: { email },
      });
      return {
        email: typeof result?.email === 'string' ? result.email : '',
        available: result?.available === true,
      };
    },
  };
}

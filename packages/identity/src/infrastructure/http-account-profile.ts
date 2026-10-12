import { createConfiguredContext } from '@quarks.studio/config/http';
import { persistProfileIdentity } from './profile-session';
import type {
  AccountProfile,
  AccountProfileChanges,
  AuthProviderLabel,
  EmailAvailability,
} from '../application/account-dashboard.port';

const KNOWN_PROVIDERS: ReadonlySet<string> = new Set([
  'google',
  'github',
  'twitter',
  'facebook',
  'emulator',
  'oauth',
]);

function providerLabel(value: unknown): AuthProviderLabel | null {
  return typeof value === 'string' && KNOWN_PROVIDERS.has(value)
    ? (value as AuthProviderLabel)
    : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Normalize whatever `auth/me` answers today. Older responses only carry
 * `id`, `username`, `displayName`, `photoURL` and `createdAt`; the profile
 * fields of the dashboard are read defensively and given safe defaults so the
 * UI never crashes against a server that has not shipped them yet.
 */
function normalize(raw: Record<string, unknown>): AccountProfile {
  const email = stringOrNull(raw['email']);
  const linkedEmails = stringArray(raw['linkedEmails']);
  return {
    id: typeof raw['id'] === 'string' ? raw['id'] : '',
    username: typeof raw['username'] === 'string' ? raw['username'] : '',
    displayName:
      typeof raw['displayName'] === 'string' && raw['displayName'] !== ''
        ? raw['displayName']
        : 'Guest',
    email,
    provider: providerLabel(raw['provider']),
    linkedEmails: linkedEmails.length ? linkedEmails : email ? [email] : [],
    publicEmail: stringOrNull(raw['publicEmail']),
  };
}

/**
 * Real adapter for the Profile tab. Reads and updates `auth/me` through the
 * ambient configured transport so the browser session bearer is applied.
 */
export function createHttpAccountProfile(apiBaseUrl?: string) {
  const context = createConfiguredContext(apiBaseUrl);
  return {
    get: async (): Promise<AccountProfile> =>
      normalize(await context.fetchJson<Record<string, unknown>>('auth/me')),
    update: async (changes: AccountProfileChanges): Promise<AccountProfile> => {
      const raw = await context.fetchJson<Record<string, unknown>>('auth/me', {
        method: 'POST',
        body: changes,
      });
      const submitted = {
        ...changes,
        linkedEmails:
          changes.linkedEmails !== undefined
            ? changes.linkedEmails
            : stringArray(raw['linkedEmails']),
        publicEmail:
          changes.publicEmail !== undefined
            ? changes.publicEmail
            : stringOrNull(raw['publicEmail']),
      };
      const profile = normalize({ ...raw, ...submitted });
      await persistProfileIdentity({
        id: profile.id,
        username: profile.username,
        photoURL: null,
        createdAt: null,
        displayName: profile.displayName,
      });
      return profile;
    },
    checkEmail: async (email: string): Promise<EmailAvailability> => {
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

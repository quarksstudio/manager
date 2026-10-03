import {
  APP_NAME,
  AUTH_SESSION_KEY,
  clearSession,
  saveSession,
} from '@quarks.studio/config';

import type { AuthSession } from '../domain/auth-session';
import type { SessionRepository } from '../application/identity.port';

/** Sessions live in the shared configuration store, not in this package. */
export function createConfigSessionRepository(): SessionRepository {
  return {
    // A login has no expiry to honour, so the default stays implicit rather
    // than being forwarded as an explicit `undefined`.
    save: (session: AuthSession, ttlMs?: number) =>
      ttlMs === undefined ? saveSession(session) : saveSession(session, ttlMs),
    clear: () => clearSession(),
  };
}

export { APP_NAME, AUTH_SESSION_KEY, clearSession, saveSession };

/**
 * A stored session the registry no longer accepts is worthless to every tab
 * that read it, so the change is broadcast on the standard storage event.
 */
export function notifySessionChange(): void {
  if (typeof window === 'undefined') return;
  // The stored key is namespaced by the storage engine, so the event has to
  // carry the same prefix or a key-filtered listener never matches it.
  window.dispatchEvent(
    new StorageEvent('storage', { key: `${APP_NAME}:${AUTH_SESSION_KEY}` }),
  );
}

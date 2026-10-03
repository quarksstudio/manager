// The storage root is headless; React hooks have a separate entry.
import {
  createStorage,
  type IStorageEngine,
} from '@quarks.studio/storage';

import { withoutSecrets, type AppConfig } from '../domain/config';

export type { IStorageEngine };

export const AUTH_SESSION_KEY = 'auth:session';
export const CONFIG_KEY = 'config';
export const APP_NAME = 'quarks';

export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken?: string;
  user?: SessionUser;
}

let engine: IStorageEngine | undefined;
let revision = 0;

/**
 * Monotonic counter bumped on every write. `loadConfig` compares it against the
 * revision it resolved at, so writing the session or the configuration
 * invalidates the memo without any explicit wiring. Without this a long-lived
 * process (the Astro server, the registry daemon) would keep serving the token
 * it read at startup and never notice a login.
 */
export function storeRevision(): number {
  return revision;
}

function appStore(): IStorageEngine {
  engine ??= createStorage({ namespace: APP_NAME, isConfig: true });
  return engine;
}

/** Drop the memoized engine so a test can swap the storage backend. */
export function resetStore(): void {
  engine = undefined;
}

export function loadSession(): Promise<Session | null> {
  return appStore().getItem<Session>(AUTH_SESSION_KEY);
}

/**
 * Bump only once the write has settled, so a concurrent `loadConfig` can never
 * observe the new revision while the old value is still on disk. The write is
 * wrapped in `Promise.resolve` because storage engines are pluggable and a
 * custom adapter may return void.
 */
function commit<T>(write: Promise<T> | T): Promise<T> {
  return Promise.resolve(write).then((value) => {
    revision += 1;
    return value;
  });
}

export function saveSession(session: Session, ttlMs?: number): Promise<void> {
  return commit(
    ttlMs === undefined
      ? appStore().setItem(AUTH_SESSION_KEY, session)
      : appStore().setItem(AUTH_SESSION_KEY, session, ttlMs),
  );
}

export function clearSession(): Promise<void> {
  return commit(appStore().removeItem(AUTH_SESSION_KEY));
}

/** Values the user stored through `quark config set`; secrets are absent. */
export async function loadPersisted(): Promise<Partial<AppConfig>> {
  try {
    const stored = await appStore().getItem<Partial<AppConfig>>(CONFIG_KEY);
    return stored && typeof stored === 'object' ? { ...stored } : {};
  } catch {
    return {};
  }
}

export function persistConfig(config: AppConfig): Promise<void> {
  return commit(appStore().setItem(CONFIG_KEY, withoutSecrets(config)));
}

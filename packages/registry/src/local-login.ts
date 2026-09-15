import { createStorage } from '@quark/use-storage';
import { Client } from './lib';
import type { AuthSession } from './auth-login';
import { apiFetch, AUTH_SESSION_KEY } from './lib/api-fetch';

/** Explicit development login against a Firebase Auth emulator. */
export async function loginWithEmulator(
  endpoint: string,
  email: string,
  password: string,
): Promise<void> {
  const response = await fetch(
    `${endpoint}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const result = await response.json();
  if (!response.ok || !result.idToken) throw new Error('Local login failed');
  const session = await apiFetch<AuthSession>(
    `${Client.API.replace(/\/$/, '')}/auth/exchange`,
    {
      method: 'POST',
      skipAuth: true,
      useCache: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: result.idToken,
        refreshToken: result.refreshToken,
      }),
    },
  );
  if (!session.accessToken || !session.user?.uid)
    throw new Error('Invalid local authentication session');
  await createStorage({ namespace: 'app' }).setItem(
    AUTH_SESSION_KEY,
    session,
    Number(result.expiresIn) * 1000,
  );
}

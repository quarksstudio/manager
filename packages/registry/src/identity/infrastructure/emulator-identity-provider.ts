import type {
  EmulatorIdentity,
  EmulatorIdentityProvider,
} from '../application/login-with-emulator';

/** The Firebase Auth emulator's REST surface, pinned to a local key. */
export function createHttpEmulatorIdentityProvider(): EmulatorIdentityProvider {
  return {
    async signIn(endpoint, email, password): Promise<EmulatorIdentity> {
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
      return {
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      };
    },
  };
}

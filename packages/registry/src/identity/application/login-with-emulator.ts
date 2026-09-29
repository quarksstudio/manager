import type { AuthSession } from '../domain/auth-session';
import type { IdentityGateway, SessionRepository } from './identity.port';

/** What the local Firebase Auth emulator answers with. */
export interface EmulatorIdentity {
  idToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface EmulatorIdentityProvider {
  signIn(
    endpoint: string,
    email: string,
    password: string,
  ): Promise<EmulatorIdentity>;
}

export interface EmulatorLoginDependencies {
  gateway: IdentityGateway;
  sessions: SessionRepository;
  emulator: EmulatorIdentityProvider;
}

/**
 * Explicit development login against a Firebase Auth emulator.
 *
 * The exchange runs through a gateway built without the stored bearer: a
 * development host authenticates for the first time, so there is no session to
 * present and no reason to ask for one.
 */
export function createLoginWithEmulator({
  gateway,
  sessions,
  emulator,
}: EmulatorLoginDependencies) {
  return async function loginWithEmulator(
    endpoint: string,
    email: string,
    password: string,
  ): Promise<void> {
    const identity = await emulator.signIn(endpoint, email, password);
    const session = await gateway.exchange(identity.idToken, identity.refreshToken);
    if (!session.accessToken || !session.user?.uid) {
      throw new Error('Invalid local authentication session');
    }
    await sessions.save(session, Number(identity.expiresIn) * 1000);
  };
}

export type { AuthSession };

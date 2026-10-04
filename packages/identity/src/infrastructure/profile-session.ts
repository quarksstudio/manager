import { loadSession, saveSession } from '@quarks.studio/config';
import { createConfiguredContext } from '@quarks.studio/config/http';
import { createHttpIdentityGateway } from './http-identity-gateway';
import type { IdentitySession } from '../domain/auth-session';
import type { PublicUserProfile } from '../domain/public-user-profile';

/** Resolve legacy sessions before building a username-based link. */
export async function resolveSessionProfile(
  session: IdentitySession | null,
): Promise<IdentitySession | null> {
  if (!session || session.user?.username) return session;
  const current = await createHttpIdentityGateway(
    createConfiguredContext(),
  ).me();
  const uid = current.id ?? current.uid;
  if (typeof uid !== 'string' || typeof current.username !== 'string')
    return session;
  return {
    ...session,
    user: {
      uid,
      id: uid,
      username: current.username,
      email: session.user?.email ?? null,
      displayName: session.user?.displayName ?? null,
      photoURL: session.user?.photoURL ?? null,
    },
  };
}

export async function persistProfileIdentity(
  profile: PublicUserProfile & { displayName?: string },
): Promise<void> {
  const session = await resolveSessionProfile(await loadSession());
  if (!session?.user || (session.user.id ?? session.user.uid) !== profile.id)
    return;
  await saveSession({
    ...session,
    user: {
      ...session.user,
      id: profile.id,
      username: profile.username,
      ...(profile.displayName !== undefined
        ? { displayName: profile.displayName }
        : {}),
    },
  });
}

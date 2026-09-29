export type AuthProvider = 'google' | 'github' | 'twitter' | 'facebook';

export type LoginStrategy = 'manual-code' | 'local-server' | 'deep-link';

export interface LoginOptions {
  provider: AuthProvider;
  strategy?: LoginStrategy;
  localServerPort?: number;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}

export type AuthStep =
  | 'idle'
  | 'selecting-provider'
  | 'opening-browser'
  | 'waiting-for-code'
  | 'waiting-for-redirect'
  | 'exchanging-token'
  | 'authenticated';

export type StepListener = (step: AuthStep, details?: string) => void;

export interface CurrentUser {
  id?: string;
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  [key: string]: unknown;
}

export const AUTH_PROVIDERS: AuthProvider[] = [
  'google',
  'github',
  'twitter',
  'facebook',
];

export function validateProvider(
  provider: string,
): asserts provider is AuthProvider {
  if (!AUTH_PROVIDERS.includes(provider as AuthProvider)) {
    throw new Error(`Unsupported authentication provider: ${provider}`);
  }
}

export function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthSession>;
  return (
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.length > 0 &&
    !!candidate.user &&
    typeof candidate.user.uid === 'string' &&
    candidate.user.uid.length > 0
  );
}

export function validateSession(session: AuthSession): void {
  if (!isAuthSession(session)) {
    throw new Error('Backend returned an invalid authentication session');
  }
}

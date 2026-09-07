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
type StepListener = (step: AuthStep) => void;
export declare function loginWithProvider(
  options: LoginOptions,
  onStep?: StepListener,
): Promise<AuthSession>;
export declare function submitManualLoginCode(code: string): void;
export {};

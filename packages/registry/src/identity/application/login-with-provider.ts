import { AUTH_MESSAGE } from '../domain/auth-callback-protocol';
import {
  validateProvider,
  validateSession,
  type AuthSession,
  type LoginOptions,
  type LoginStrategy,
  type StepListener,
} from '../domain/auth-session';
import type {
  BrowserLauncher,
  IdentityGateway,
  LoginEnvironment,
  LoopbackCallback,
  ManualCodeChannel,
  PopupCallback,
  SessionRepository,
} from './identity.port';

export const AUTH_POPUP = 'quark-auth';
export const LOGIN_TIMEOUT_MS = 180_000;

export interface LoginDependencies {
  /** The registry base URL, `/v1` included; `authorizationUrl` is built on it. */
  baseUrl: string;
  gateway: IdentityGateway;
  sessions: SessionRepository;
  launcher: BrowserLauncher;
  popup: PopupCallback;
  codes: ManualCodeChannel;
  loopback: LoopbackCallback;
  environment: LoginEnvironment;
  timeoutMs?: number;
}

/**
 * The whole provider handshake, with every effect injected.
 *
 * The registry server owns the identity handshake: opening
 * `GET /auth/login/:provider/:callback` makes it call the identity provider with
 * the server credential and answer a redirect, so the credential never reaches
 * the browser. This use case only builds that URL and waits for a token back.
 */
export function createLoginWithProvider({
  baseUrl,
  gateway,
  sessions,
  launcher,
  popup,
  codes,
  loopback,
  environment,
  timeoutMs = LOGIN_TIMEOUT_MS,
}: LoginDependencies) {
  function authorizationUrl(
    provider: string,
    continueUri: string,
  ): string {
    return `${baseUrl.replace(/\/$/, '')}/auth/login/${provider}/${encodeURIComponent(continueUri)}`;
  }

  async function exchangeTokens(payload: {
    token: string;
    refreshToken?: string;
  }): Promise<AuthSession> {
    const session = await gateway.exchange(payload.token, payload.refreshToken);
    validateSession(session);
    return session;
  }

  async function manualCode(
    options: LoginOptions,
    onStep?: StepListener,
  ): Promise<AuthSession> {
    const authUrl = authorizationUrl(options.provider, 'http://localhost');
    onStep?.('opening-browser', authUrl);
    await launcher.open(authUrl);
    onStep?.('waiting-for-code', authUrl);
    const token = await codes.wait();
    onStep?.('exchanging-token');
    return exchangeTokens({ token });
  }

  async function localServer(
    options: LoginOptions,
    onStep?: StepListener,
  ): Promise<AuthSession> {
    const { token, refreshToken } = await loopback.capture({
      port: options.localServerPort,
      authorizationUrl: (continueUri) =>
        authorizationUrl(options.provider, continueUri),
      open: async (authUrl) => {
        onStep?.('opening-browser', authUrl);
        await launcher.open(authUrl);
        onStep?.('waiting-for-redirect', authUrl);
      },
    });
    onStep?.('exchanging-token');
    return exchangeTokens({ token, refreshToken });
  }

  async function deepLink(
    options: LoginOptions,
    onStep?: StepListener,
  ): Promise<AuthSession> {
    const origin = environment.origin();
    if (!origin) {
      throw new Error(
        'Deep-link login requires a browser or desktop renderer',
      );
    }
    const state = environment.randomState();
    const callback = `${origin}/callback?state=${encodeURIComponent(state)}`;
    const authUrl = authorizationUrl(options.provider, callback);
    onStep?.('opening-browser', authUrl);
    // A named popup, and deliberately without `noopener`/`noreferrer`: the
    // callback page hands the session back through `window.opener`, which those
    // features would null out.
    const handle = await launcher.open(
      authUrl,
      AUTH_POPUP,
      'popup,width=520,height=680',
    );
    if (!handle) throw new Error('The authentication popup was blocked');
    onStep?.('waiting-for-redirect', authUrl);
    const payload = (await popup.await({
      popup: handle,
      origin,
      state,
      timeoutMs,
    })) as Record<string, unknown> | null;
    const failure = payload?.['error'];
    if (typeof failure === 'string' && failure) throw new Error(failure);
    const session = payload?.['session'];
    if (!isSessionShape(session)) {
      throw new Error('Authentication callback returned an invalid session');
    }
    return session;
  }

  function captureSession(
    options: LoginOptions,
    strategy: LoginStrategy,
    onStep?: StepListener,
  ): Promise<AuthSession> {
    if (strategy === 'manual-code') return manualCode(options, onStep);
    if (strategy === 'deep-link') return deepLink(options, onStep);
    return localServer(options, onStep);
  }

  return async function loginWithProvider(
    options: LoginOptions,
    onStep?: StepListener,
  ): Promise<AuthSession> {
    validateProvider(options.provider);
    onStep?.('selecting-provider');
    const strategy =
      options.strategy ?? (environment.origin() ? 'deep-link' : 'local-server');
    let session: AuthSession;
    try {
      session = await captureSession(options, strategy, onStep);
    } catch (error) {
      if (!options.strategy && strategy === 'local-server') {
        session = await captureSession(options, 'manual-code', onStep);
      } else {
        throw error;
      }
    }
    await sessions.save(session);
    onStep?.('authenticated');
    return session;
  };
}

/** The callback page hands the session straight over, so it is not re-fetched. */
function isSessionShape(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as AuthSession;
  return typeof candidate.accessToken === 'string' && !!candidate.user?.uid;
}

export { AUTH_MESSAGE };
export type { AuthSession, LoginOptions, LoginStrategy, StepListener };

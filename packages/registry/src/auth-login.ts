import { createStorage } from '@quark/use-storage';

import { Client } from './lib';
import { apiFetch, AUTH_SESSION_KEY } from './lib/api-fetch';

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
type TokenPayload = { token: string; refreshToken?: string };

const LOGIN_TIMEOUT_MS = 180_000;
let pendingManualCode:
  | { resolve: (code: string) => void; reject: (error: Error) => void }
  | undefined;

export async function loginWithProvider(
  options: LoginOptions,
  onStep?: StepListener,
): Promise<AuthSession> {
  validateProvider(options.provider);
  onStep?.('selecting-provider');
  const strategy = options.strategy ?? detectStrategy();
  let payload: TokenPayload;
  try {
    payload = await captureToken(options, strategy, onStep);
  } catch (error) {
    if (!options.strategy && strategy === 'local-server') {
      payload = await captureToken(options, 'manual-code', onStep);
    } else {
      throw error;
    }
  }
  onStep?.('exchanging-token');
  const base = Client.API.replace(/\/$/, '');
  const session = await apiFetch<AuthSession>(`${base}/auth/exchange`, {
    method: 'POST',
    skipAuth: true,
    useCache: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  validateSession(session);
  await createStorage({ namespace: 'app' }).setItem(AUTH_SESSION_KEY, session);
  onStep?.('authenticated');
  return session;
}

export function submitManualLoginCode(code: string): void {
  const normalized = code.trim();
  if (!pendingManualCode)
    throw new Error('No manual login is waiting for a code');
  if (!normalized) throw new Error('Authentication code must not be empty');
  const pending = pendingManualCode;
  pendingManualCode = undefined;
  pending.resolve(normalized);
}

async function captureToken(
  options: LoginOptions,
  strategy: LoginStrategy,
  onStep?: StepListener,
): Promise<TokenPayload> {
  if (strategy === 'manual-code') return manualCode(options, onStep);
  if (strategy === 'deep-link') return deepLink(options, onStep);
  return localServer(options, onStep);
}

async function manualCode(
  options: LoginOptions,
  onStep?: StepListener,
): Promise<TokenPayload> {
  const authUrl = await getAuthorizationUrl(
    options.provider,
    'http://localhost',
  );
  onStep?.('opening-browser');
  await openBrowser(authUrl);
  onStep?.('waiting-for-code');
  const token = await waitForManualCode();
  return { token };
}

async function localServer(
  options: LoginOptions,
  onStep?: StepListener,
): Promise<TokenPayload> {
  if (typeof window !== 'undefined') {
    throw new Error('Local-server login is only available in Node.js');
  }
  const [{ createServer }, { randomBytes }] = await Promise.all([
    import('http'),
    import('crypto'),
  ]);
  const state = randomBytes(32).toString('base64url');
  let timeout: ReturnType<typeof setTimeout>;
  let settled = false;
  const result = new Promise<TokenPayload>((resolve, reject) => {
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
      if (url.pathname !== '/callback') {
        response.writeHead(404).end('Not found');
        return;
      }
      const receivedState = url.searchParams.get('state');
      const token =
        url.searchParams.get('idToken') ?? url.searchParams.get('token');
      const refreshToken = url.searchParams.get('refreshToken') ?? undefined;
      if (receivedState !== state || !token) {
        response.writeHead(400, { 'Content-Type': 'text/plain' });
        response.end('Invalid authentication callback.');
        return;
      }
      settled = true;
      clearTimeout(timeout);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(
        '<h1>Authentication completed</h1><p>You may close this tab.</p>',
      );
      server.close();
      resolve({ token, refreshToken });
    });
    server.on('error', reject);
    server.listen(options.localServerPort ?? 0, '127.0.0.1', async () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not determine local callback port'));
        return;
      }
      const callback = `http://127.0.0.1:${address.port}/callback?state=${encodeURIComponent(state)}`;
      try {
        const authUrl = await getAuthorizationUrl(options.provider, callback);
        onStep?.('opening-browser');
        await openBrowser(authUrl);
        onStep?.('waiting-for-redirect');
      } catch (error) {
        server.close();
        reject(error);
      }
    });
    timeout = setTimeout(() => {
      if (settled) return;
      server.close();
      reject(new Error('Authentication timed out after 3 minutes'));
    }, LOGIN_TIMEOUT_MS);
  });
  return result;
}

async function deepLink(
  options: LoginOptions,
  onStep?: StepListener,
): Promise<TokenPayload> {
  if (typeof window === 'undefined') {
    throw new Error('Deep-link login requires a browser or desktop renderer');
  }
  const state = randomBrowserState();
  const callback = `${window.location.origin}/auth/callback?state=${encodeURIComponent(state)}`;
  const authUrl = await getAuthorizationUrl(options.provider, callback);
  onStep?.('opening-browser');
  window.open(authUrl, '_blank', 'noopener,noreferrer');
  onStep?.('waiting-for-redirect');
  return new Promise<TokenPayload>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Authentication timed out after 3 minutes'));
    }, LOGIN_TIMEOUT_MS);
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, string>>).detail;
      if (detail?.['state'] !== state || !detail['token']) return;
      cleanup();
      resolve({
        token: detail['token'],
        refreshToken: detail['refreshToken'],
      });
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener('quark-auth-callback', listener);
    };
    window.addEventListener('quark-auth-callback', listener);
  });
}

function waitForManualCode(): Promise<string> {
  if (pendingManualCode)
    throw new Error('Another manual login is already pending');
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingManualCode = undefined;
      reject(new Error('Authentication timed out after 3 minutes'));
    }, LOGIN_TIMEOUT_MS);
    pendingManualCode = {
      resolve: (code) => {
        clearTimeout(timeout);
        resolve(code);
      },
      reject,
    };
  });
}

async function getAuthorizationUrl(
  provider: AuthProvider,
  continueUri: string,
): Promise<string> {
  const client = new Client() as unknown as {
    Auth: { getUrlLogin(provider: string, uri: string): Promise<string> };
  };
  return client.Auth.getUrlLogin(provider, continueUri);
}

async function openBrowser(url: string): Promise<void> {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const { spawn } = await import('child_process');
  const command =
    process.platform === 'darwin'
      ? { executable: 'open', args: [url] }
      : process.platform === 'win32'
        ? { executable: 'cmd', args: ['/c', 'start', '', url] }
        : { executable: 'xdg-open', args: [url] };
  const child = spawn(command.executable, command.args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function detectStrategy(): LoginStrategy {
  return typeof window === 'undefined' ? 'local-server' : 'deep-link';
}

function randomBrowserState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join(
    '',
  );
}

function validateProvider(provider: string): asserts provider is AuthProvider {
  if (!['google', 'github', 'twitter', 'facebook'].includes(provider)) {
    throw new Error(`Unsupported authentication provider: ${provider}`);
  }
}

function validateSession(session: AuthSession): void {
  if (!session?.accessToken || !session.user?.uid) {
    throw new Error('Backend returned an invalid authentication session');
  }
}

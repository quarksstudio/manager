import { currentEnv } from '@quarks.studio/config';
import {
  createGlobalContext,
  registryConfiguration,
} from '@quarks.studio/config/http';

import { createLoginWithEmulator, createLoginWithProvider } from '../index';
import {
  createConfigSessionRepository,
  createHttpEmulatorIdentityProvider,
  createHttpIdentityGateway,
  createLoopbackCallback,
  createManualCodeChannel,
  createPopupCallback,
  createSystemBrowserLauncher,
} from '../http';
import type {
  LoginEnvironment,
  AuthSession,
  LoginOptions,
  StepListener,
} from '../index';

/**
 * The manual-code channel is module state on purpose: the code is typed into
 * whichever screen is on the terminal, not handed to a function.
 */
const codes = createManualCodeChannel();

/** A browser is the only place with an origin to redirect back to. */
const environment: LoginEnvironment = {
  origin: () => (typeof window === 'undefined' ? null : window.location.origin),
  randomState: () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) =>
      value.toString(16).padStart(2, '0'),
    ).join('');
  },
};

async function unauthenticatedGateway() {
  // A login has no session to present yet, so the exchange must not borrow one.
  const context = await createGlobalContext({
    baseUrl: registryConfiguration.registryUrl,
    skipAuth: true,
  });
  return createHttpIdentityGateway(context);
}

async function loginWithProvider(
  options: LoginOptions,
  onStep?: StepListener,
): Promise<AuthSession> {
  const run = createLoginWithProvider({
    baseUrl: registryConfiguration.registryUrl,
    gateway: await unauthenticatedGateway(),
    sessions: createConfigSessionRepository(),
    launcher: createSystemBrowserLauncher(),
    popup: createPopupCallback(),
    codes,
    loopback: createLoopbackCallback(),
    environment,
  });
  return run(options, onStep);
}

function submitManualLoginCode(code: string): void {
  codes.submit(code);
}

async function loginWithEmulator(
  endpoint: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const env = currentEnv();
  if ((env['QUARKS_ENV'] ?? env['QUARK_ENV']) !== 'local') {
    throw new Error(
      'Emulator login is only available in the local environment',
    );
  }
  const run = createLoginWithEmulator({
    gateway: await unauthenticatedGateway(),
    sessions: createConfigSessionRepository(),
    emulator: createHttpEmulatorIdentityProvider(),
  });
  return run(endpoint, email, password);
}

async function loginWithLocalEmulator(): Promise<AuthSession> {
  const env = currentEnv();
  if ((env['QUARKS_ENV'] ?? env['QUARK_ENV']) !== 'local') {
    throw new Error(
      'Emulator login is only available in the local environment',
    );
  }
  const host = env['QUARK_AUTH_EMULATOR_HOST']?.trim();
  if (!host)
    throw new Error('QUARK_AUTH_EMULATOR_HOST is required for emulator login');
  let endpoint: URL;
  try {
    endpoint = new URL(host.includes('://') ? host : `http://${host}`);
    if (
      !['http:', 'https:'].includes(endpoint.protocol) ||
      endpoint.username ||
      endpoint.password
    ) {
      throw new Error('Invalid emulator host');
    }
  } catch {
    throw new Error('QUARK_AUTH_EMULATOR_HOST must be a host:port or HTTP URL');
  }
  return loginWithEmulator(
    endpoint.href.replace(/\/$/, ''),
    env['QUARK_AUTH_EMULATOR_EMAIL'] || 'developer@quark.local',
    env['QUARK_AUTH_EMULATOR_PASSWORD'] || 'quark-local-password',
  );
}

export {
  loginWithEmulator,
  loginWithLocalEmulator,
  loginWithProvider,
  submitManualLoginCode,
};

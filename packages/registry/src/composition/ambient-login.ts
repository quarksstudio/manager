import { createLoginWithEmulator } from '@quarks.studio/identity';
import { createLoginWithProvider } from '@quarks.studio/identity';
import { createConfigSessionRepository } from '@quarks.studio/identity/http';
import { createHttpEmulatorIdentityProvider } from '@quarks.studio/identity/http';
import { createHttpIdentityGateway } from '@quarks.studio/identity/http';
import { createLoopbackCallback } from '@quarks.studio/identity/http';
import { createManualCodeChannel } from '@quarks.studio/identity/http';
import { createPopupCallback } from '@quarks.studio/identity/http';
import { createSystemBrowserLauncher } from '@quarks.studio/identity/http';
import { createGlobalContext } from './ambient-context';
import { registryConfiguration } from './registry-configuration';
import type { LoginEnvironment } from '@quarks.studio/identity';
import type {
  AuthSession,
  LoginOptions,
  StepListener,
} from '@quarks.studio/identity';

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
): Promise<void> {
  const run = createLoginWithEmulator({
    gateway: await unauthenticatedGateway(),
    sessions: createConfigSessionRepository(),
    emulator: createHttpEmulatorIdentityProvider(),
  });
  return run(endpoint, email, password);
}

export { loginWithEmulator, loginWithProvider, submitManualLoginCode };

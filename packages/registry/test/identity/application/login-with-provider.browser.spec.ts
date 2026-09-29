/**
 * @jest-environment jsdom
 */
import { saveSession } from '@quarks.studio/config';

import { loginWithProvider } from '../../../src/composition/ambient-login';
import { AUTH_MESSAGE } from '../../../src/identity/domain/auth-callback-protocol';
import type { AuthSession } from '../../../src/identity/domain/auth-session';

const close = jest.fn();

jest.mock('../../../src/composition/registry-configuration', () => ({
  registryConfiguration: { registryUrl: 'https://registry.test/v1' },
}));
jest.mock('../../../src/composition/ambient-context', () => ({
  createGlobalContext: jest.fn(async () => ({ fetchJson: jest.fn() })),
}));
jest.mock('@quarks.studio/config', () => ({ saveSession: jest.fn() }));

const saved = saveSession as jest.MockedFunction<typeof saveSession>;
const session: AuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    uid: 'user-1',
    email: 'user@example.com',
    displayName: 'User',
    photoURL: null,
  },
};

describe('deep-link login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'open').mockReturnValue({ close } as unknown as Window);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the server redirect route without noopener so the opener survives', async () => {
    const { state, callback } = await startLogin();

    expect(window.open).toHaveBeenCalledWith(
      `https://registry.test/v1/auth/login/google/${encodeURIComponent(callback.href)}`,
      expect.any(String),
      expect.not.stringContaining('noopener'),
    );
    expect(callback.pathname).toBe('/auth/callback');
    expect(state).toEqual(expect.any(String));
  });

  it('resolves with the session the callback page already exchanged', async () => {
    const { state, result } = await startLogin();

    post({ type: AUTH_MESSAGE, state, session });

    await expect(result).resolves.toEqual(session);
    expect(saved).toHaveBeenCalledWith(session);
    expect(close).toHaveBeenCalled();
  });

  it('ignores messages from another origin or with a stale state', async () => {
    const { state, result } = await startLogin();

    post({ type: AUTH_MESSAGE, state, session }, 'https://evil.test');
    post({ type: AUTH_MESSAGE, state: 'stale', session });
    await Promise.resolve();
    expect(saved).not.toHaveBeenCalled();

    post({ type: AUTH_MESSAGE, state, session });
    await expect(result).resolves.toEqual(session);
  });

  it('surfaces the failure reported by the callback page', async () => {
    const { state, result } = await startLogin();

    post({
      type: AUTH_MESSAGE,
      state,
      error: 'Registry request failed (401)',
    });

    await expect(result).rejects.toThrow('Registry request failed (401)');
    expect(saved).not.toHaveBeenCalled();
  });

  it('rejects a malformed session instead of saving it', async () => {
    const { state, result } = await startLogin();

    post({ type: AUTH_MESSAGE, state, session: { user: {} } });

    await expect(result).rejects.toThrow('invalid session');
    expect(saved).not.toHaveBeenCalled();
  });

  it('fails fast when the popup is blocked', async () => {
    (window.open as jest.Mock).mockReturnValue(null);

    await expect(loginWithProvider({ provider: 'google' })).rejects.toThrow(
      'The authentication popup was blocked',
    );
  });
});

async function startLogin(): Promise<{
  state: string;
  callback: URL;
  steps: string[];
  result: Promise<AuthSession>;
}> {
  const steps: string[] = [];
  const result = loginWithProvider({ provider: 'google' }, (step) =>
    steps.push(step),
  );
  // The listener is registered in the same synchronous block that reports the
  // step, so waiting for it guarantees the message below is not lost.
  await waitUntil(() => steps.includes('waiting-for-redirect'));
  // The last segment is the encoded continue URI the server will hand to the
  // identity provider; decoding it gives back the callback page.
  const opened = (window.open as jest.Mock).mock.calls.at(-1)![0] as string;
  const callback = new URL(
    decodeURIComponent(opened.slice(opened.lastIndexOf('/') + 1)),
  );
  return {
    state: callback.searchParams.get('state')!,
    callback,
    steps,
    result,
  };
}

function post(data: unknown, origin = window.location.origin): void {
  window.dispatchEvent(new MessageEvent('message', { data, origin }));
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Condition was not reached');
}

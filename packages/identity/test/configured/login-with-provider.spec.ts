import { createStorage } from '@quarks.studio/storage';
import { APP_NAME } from '@quarks.studio/config';

import { loginWithProvider, submitManualLoginCode } from '../../src/configured';
import { createGlobalContext } from '@quarks.studio/config/http';

const setItem = jest.fn();
const spawn = jest.fn(() => ({ unref: jest.fn() }));
const fetchJson = jest.fn();

jest.mock('@quarks.studio/config/http', () => ({
  ...jest.requireActual('@quarks.studio/config/http'),
  createGlobalContext: jest.fn(),
}));
jest.mock('@quarks.studio/storage', () => ({
  createStorage: jest.fn(() => ({ setItem })),
}));
jest.mock('child_process', () => ({ spawn }));

const context = createGlobalContext as jest.MockedFunction<
  typeof createGlobalContext
>;

describe('loginWithProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    context.mockResolvedValue({
      baseUrl: 'https://registry.test/v1',
      fetchJson,
    } as never);
    fetchJson.mockResolvedValue({
      accessToken: 'id-token',
      refreshToken: 'refresh-token',
      user: {
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        photoURL: null,
      },
    });
  });

  it('completes manual login, validates remotely and stores the session', async () => {
    const steps: string[] = [];
    const pending = loginWithProvider(
      { provider: 'github', strategy: 'manual-code' },
      (step) => steps.push(step),
    );
    await waitUntil(() => steps.includes('waiting-for-code'));
    submitManualLoginCode(' id-token ');

    const session = await pending;

    // A login has no session to present, so the exchange must be unauthenticated.
    expect(context).toHaveBeenCalledWith({
      skipAuth: true,
    });
    expect(fetchJson).toHaveBeenCalledWith('auth/exchange', {
      method: 'POST',
      body: { token: 'id-token' },
    });
    expect(createStorage).toHaveBeenCalledWith({
      namespace: APP_NAME,
      isConfig: true,
    });
    expect(setItem).toHaveBeenCalledWith('auth:session', session);
    expect(steps.at(-1)).toBe('authenticated');
  });

  it('opens the server route instead of calling the identity provider', async () => {
    const steps: string[] = [];
    const pending = loginWithProvider(
      { provider: 'github', strategy: 'manual-code' },
      (step) => steps.push(step),
    );
    await waitUntil(() => steps.includes('waiting-for-code'));
    submitManualLoginCode('id-token');
    await pending;

    // The registry server owns the `createAuthUri` handshake, so this process
    // never holds a credential: it only opens the redirect route.
    expect(openedUrls()).toContain(
      'https://registry.test/v1/auth/login/github/http%3A%2F%2Flocalhost',
    );
  });

  it('rejects unsupported providers before opening a browser', async () => {
    await expect(
      loginWithProvider({ provider: 'invalid' as 'google' }),
    ).rejects.toThrow('Unsupported authentication provider');
    expect(spawn).not.toHaveBeenCalled();
  });
});

/** The URLs this process handed to the platform browser opener. */
function openedUrls(): string[] {
  const calls = spawn.mock.calls as unknown as Array<[string, string[]]>;
  return calls.flatMap(([, args]) => args);
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Condition was not reached');
}

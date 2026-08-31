import { createStorage } from '@quark/use-storage';

import { loginWithProvider, submitManualLoginCode } from './auth-login';
import { apiFetch } from './lib/api-fetch';

const getUrlLogin = jest.fn();
const setItem = jest.fn();
const spawn = jest.fn(() => ({ unref: jest.fn() }));

jest.mock('./lib', () => ({
  Client: Object.assign(
    jest.fn(() => ({ Auth: { getUrlLogin } })),
    { API: 'https://registry.test/v1' },
  ),
}));
jest.mock('./lib/api-fetch', () => ({
  AUTH_SESSION_KEY: 'auth:session',
  apiFetch: jest.fn(),
}));
jest.mock('@quark/use-storage', () => ({
  createStorage: jest.fn(() => ({ setItem })),
}));
jest.mock('child_process', () => ({ spawn }));

const fetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('loginWithProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUrlLogin.mockResolvedValue('https://firebase.test/login');
    fetchMock.mockResolvedValue({
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

    expect(fetchMock).toHaveBeenCalledWith(
      'https://registry.test/v1/auth/exchange',
      expect.objectContaining({
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ token: 'id-token' }),
      }),
    );
    expect(createStorage).toHaveBeenCalledWith({ namespace: 'app' });
    expect(setItem).toHaveBeenCalledWith('auth:session', session);
    expect(steps.at(-1)).toBe('authenticated');
  });

  it('rejects unsupported providers before opening a browser', async () => {
    await expect(
      loginWithProvider({ provider: 'invalid' as 'google' }),
    ).rejects.toThrow('Unsupported authentication provider');
    expect(spawn).not.toHaveBeenCalled();
  });
});

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Condition was not reached');
}

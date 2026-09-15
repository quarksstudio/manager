import { loginWithEmulator } from './local-login';
import { apiFetch } from './lib/api-fetch';
const setItem = jest.fn();
jest.mock('@quark/use-storage', () => ({ createStorage: () => ({ setItem }) }));
jest.mock('./lib', () => ({ Client: { API: '/v1' } }));
jest.mock('./lib/api-fetch', () => ({
  AUTH_SESSION_KEY: 'auth:session',
  apiFetch: jest.fn(),
}));
const originalFetch = global.fetch;
afterAll(() => {
  global.fetch = originalFetch;
});
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        idToken: 'emulator-token',
        refreshToken: 'refresh',
        expiresIn: '3600',
      }),
    });
});
it('exchanges the emulator token before storing the server session', async () => {
  const session = { accessToken: 'verified-token', user: { uid: 'developer' } };
  (apiFetch as jest.Mock).mockResolvedValue(session);
  await loginWithEmulator(
    'http://localhost:9099',
    'developer@quark.local',
    'password',
  );
  expect(apiFetch).toHaveBeenCalledWith(
    '/v1/auth/exchange',
    expect.objectContaining({
      method: 'POST',
      skipAuth: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'emulator-token',
        refreshToken: 'refresh',
      }),
    }),
  );
  expect(setItem).toHaveBeenCalledWith('auth:session', session, 3600000);
});
it('does not save a session when the server rejects the token', async () => {
  (apiFetch as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
  await expect(
    loginWithEmulator(
      'http://localhost:9099',
      'developer@quark.local',
      'password',
    ),
  ).rejects.toThrow('Unauthorized');
  expect(setItem).not.toHaveBeenCalled();
});

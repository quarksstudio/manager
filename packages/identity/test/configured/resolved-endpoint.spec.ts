import { resetConfig } from '@quarks.studio/config';
import { loginWithEmulator } from '../../src/configured';

jest.mock('@quarks.studio/storage', () => ({
  createStorage: () => ({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  }),
}));
const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  resetConfig();
  jest.restoreAllMocks();
});

it('exchanges the first emulator token at the resolved endpoint without authorization', async () => {
  process.env['QUARKS_ENV'] = 'local';
  process.env['QUARK_REGISTRY_URL'] = 'http://configured-registry.test/v1';
  resetConfig();
  const send = jest
    .spyOn(global, 'fetch')
    .mockImplementation(
      async (url) =>
        new Response(
          JSON.stringify(
            String(url).includes('identitytoolkit')
              ? { idToken: 'emulator-token', refreshToken: 'refresh' }
              : { accessToken: 'verified-token', user: { uid: 'developer' } },
          ),
          { headers: { 'Content-Type': 'application/json' } },
        ),
    );
  await loginWithEmulator(
    'http://emulator.test:9099',
    'developer@quark.local',
    'local-password',
  );
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[1][0]).toBe(
    'http://configured-registry.test/v1/auth/exchange',
  );
  expect(new Headers(send.mock.calls[1][1]?.headers).has('Authorization')).toBe(
    false,
  );
});

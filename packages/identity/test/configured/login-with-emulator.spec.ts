import {
  loginWithEmulator,
  loginWithLocalEmulator,
} from '../../src/configured';
import { createGlobalContext } from '@quarks.studio/config/http';

const setItem = jest.fn();
const fetchJson = jest.fn();

jest.mock('@quarks.studio/storage', () => ({
  createStorage: () => ({ setItem }),
}));
jest.mock('@quarks.studio/config/http', () => ({
  ...jest.requireActual('@quarks.studio/config/http'),
  createGlobalContext: jest.fn(),
}));

const context = createGlobalContext as jest.MockedFunction<
  typeof createGlobalContext
>;

const originalFetch = global.fetch;
const envKeys = [
  'QUARK_ENV',
  'QUARKS_ENV',
  'QUARK_AUTH_EMULATOR_HOST',
  'QUARK_AUTH_EMULATOR_EMAIL',
  'QUARK_AUTH_EMULATOR_PASSWORD',
] as const;
const originalEnv = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key]]),
);

afterAll(() => {
  global.fetch = originalFetch;
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of envKeys) delete process.env[key];
  process.env['QUARKS_ENV'] = 'local';
  context.mockResolvedValue({ fetchJson } as never);
  global.fetch = jest.fn().mockResolvedValue({
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
  fetchJson.mockResolvedValue(session);

  const result = await loginWithEmulator(
    'http://localhost:9099',
    'developer@quark.local',
    'password',
  );

  expect(result).toBe(session);
  expect(context).toHaveBeenCalledWith({ skipAuth: true });
  expect(fetchJson).toHaveBeenCalledWith('auth/exchange', {
    method: 'POST',
    body: { token: 'emulator-token', refreshToken: 'refresh' },
  });
  expect(setItem).toHaveBeenCalledWith('auth:session', session, 3600000);
});

it('does not save a session when the server rejects the token', async () => {
  fetchJson.mockRejectedValue(new Error('Unauthorized'));

  await expect(
    loginWithEmulator(
      'http://localhost:9099',
      'developer@quark.local',
      'password',
    ),
  ).rejects.toThrow('Unauthorized');
  expect(setItem).not.toHaveBeenCalled();
});

it.each(['localhost:9099', 'http://localhost:9099/'])(
  'uses the bootstrap account with host %s',
  async (host) => {
    process.env['QUARK_AUTH_EMULATOR_HOST'] = host;
    const session = {
      accessToken: 'verified-token',
      user: { uid: 'developer' },
    };
    fetchJson.mockResolvedValue(session);
    await expect(loginWithLocalEmulator()).resolves.toBe(session);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'developer@quark.local',
          password: 'quark-local-password',
          returnSecureToken: true,
        }),
      }),
    );
  },
);

it('uses configured local credentials', async () => {
  process.env['QUARK_AUTH_EMULATOR_HOST'] = 'localhost:9099';
  process.env['QUARK_AUTH_EMULATOR_EMAIL'] = 'auditor@quark.local';
  process.env['QUARK_AUTH_EMULATOR_PASSWORD'] = 'local-test-password';
  fetchJson.mockResolvedValue({
    accessToken: 'verified-token',
    user: { uid: 'auditor' },
  });
  await loginWithLocalEmulator();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      body: JSON.stringify({
        email: 'auditor@quark.local',
        password: 'local-test-password',
        returnSecureToken: true,
      }),
    }),
  );
});

it.each([undefined, 'production', 'development'])(
  'rejects direct and automatic emulator login outside local (%s)',
  async (env) => {
    if (env === undefined) delete process.env['QUARKS_ENV'];
    else process.env['QUARKS_ENV'] = env;
    await expect(loginWithLocalEmulator()).rejects.toThrow(
      'only available in the local environment',
    );
    await expect(
      loginWithEmulator(
        'http://localhost:9099',
        'developer@quark.local',
        'password',
      ),
    ).rejects.toThrow('only available in the local environment');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(context).not.toHaveBeenCalled();
  },
);

it.each([undefined, 'ftp://localhost:9099', 'http://'])(
  'rejects missing or malformed host (%s)',
  async (host) => {
    if (host !== undefined) process.env['QUARK_AUTH_EMULATOR_HOST'] = host;
    await expect(loginWithLocalEmulator()).rejects.toThrow(
      'QUARK_AUTH_EMULATOR_HOST',
    );
    expect(global.fetch).not.toHaveBeenCalled();
  },
);

it('does not exchange or store a session when credentials are rejected', async () => {
  process.env['QUARK_AUTH_EMULATOR_HOST'] = 'localhost:9099';
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    json: async () => ({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }),
  });
  await expect(loginWithLocalEmulator()).rejects.toThrow('Local login failed');
  expect(fetchJson).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
});

it('accepts QUARKS_ENV=local for CLI emulator login', async () => {
  delete process.env['QUARK_ENV'];
  process.env['QUARKS_ENV'] = 'local';
  process.env['QUARK_AUTH_EMULATOR_HOST'] = 'localhost:9099';
  const session = { accessToken: 'verified-token', user: { uid: 'developer' } };
  fetchJson.mockResolvedValue(session);
  await expect(loginWithLocalEmulator()).resolves.toBe(session);
});

it('honors QUARKS_ENV when both environment variables are set', async () => {
  process.env['QUARK_ENV'] = 'local';
  process.env['QUARKS_ENV'] = 'production';
  await expect(loginWithLocalEmulator()).rejects.toThrow(
    'only available in the local environment',
  );
  expect(global.fetch).not.toHaveBeenCalled();
});

it('does not enable emulator login with the removed QUARK_ENV name', async () => {
  delete process.env['QUARKS_ENV'];
  process.env['QUARK_ENV'] = 'local';
  process.env['QUARK_AUTH_EMULATOR_HOST'] = 'localhost:9099';
  await expect(loginWithLocalEmulator()).rejects.toThrow(
    'only available in the local environment',
  );
  await expect(
    loginWithEmulator(
      'http://localhost:9099',
      'developer@quark.local',
      'password',
    ),
  ).rejects.toThrow('only available in the local environment');
  expect(global.fetch).not.toHaveBeenCalled();
  expect(context).not.toHaveBeenCalled();
});

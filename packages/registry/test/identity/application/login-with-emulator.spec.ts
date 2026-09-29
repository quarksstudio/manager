import { loginWithEmulator } from '../../../src/composition/ambient-login';
import { createGlobalContext } from '../../../src/composition/ambient-context';

const setItem = jest.fn();
const fetchJson = jest.fn();

jest.mock('@quarks.studio/use-storage/storage', () => ({
  createStorage: () => ({ setItem }),
}));
jest.mock('../../../src/composition/registry-configuration', () => ({
  registryConfiguration: { registryUrl: '/v1' },
}));
jest.mock('../../../src/composition/ambient-context', () => ({
  createGlobalContext: jest.fn(),
}));

const context = createGlobalContext as jest.MockedFunction<
  typeof createGlobalContext
>;

const originalFetch = global.fetch;

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  jest.clearAllMocks();
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

  await loginWithEmulator(
    'http://localhost:9099',
    'developer@quark.local',
    'password',
  );

  expect(context).toHaveBeenCalledWith({ baseUrl: '/v1', skipAuth: true });
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

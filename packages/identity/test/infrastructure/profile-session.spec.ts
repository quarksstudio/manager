import {
  persistProfileIdentity,
  resolveSessionProfile,
} from '../../src/infrastructure/profile-session';
import { loadSession, saveSession } from '@quarks.studio/config';
import { createHttpIdentityGateway } from '../../src/infrastructure/http-identity-gateway';

jest.mock('@quarks.studio/config', () => ({
  loadSession: jest.fn(),
  saveSession: jest.fn(),
}));
jest.mock('@quarks.studio/config/http', () => ({
  createConfiguredContext: jest.fn(),
}));
jest.mock('../../src/infrastructure/http-identity-gateway', () => ({
  createHttpIdentityGateway: jest.fn(),
}));
const user = { uid: 'uid', email: null, displayName: null, photoURL: null };
const profile = {
  id: 'uid',
  username: 'chosen-name',
  photoURL: null,
  createdAt: null,
};
beforeEach(() => jest.clearAllMocks());

it('resolves legacy sessions through me before returning profile links', async () => {
  const me = jest
    .fn()
    .mockResolvedValue({ id: 'uid', username: 'chosen-name' });
  jest.mocked(createHttpIdentityGateway).mockReturnValue({ me } as never);
  await expect(
    resolveSessionProfile({ accessToken: 'token', user }),
  ).resolves.toMatchObject({
    user: { uid: 'uid', id: 'uid', username: 'chosen-name' },
  });
  expect(me).toHaveBeenCalledTimes(1);
});

it('does not fetch identity for sessions that already have a username', async () => {
  const session = {
    accessToken: 'token',
    user: { ...user, username: 'chosen-name' },
  };
  await expect(resolveSessionProfile(session)).resolves.toBe(session);
  expect(createHttpIdentityGateway).not.toHaveBeenCalled();
});

it('updates the stored username without replacing credentials', async () => {
  jest
    .mocked(loadSession)
    .mockResolvedValue({ accessToken: 'token', refreshToken: 'refresh', user });
  await persistProfileIdentity(profile);
  expect(saveSession).toHaveBeenCalledWith({
    accessToken: 'token',
    refreshToken: 'refresh',
    user: { ...user, id: 'uid', username: 'chosen-name' },
  });
});

it('does not update a different signed-in account', async () => {
  jest.mocked(createHttpIdentityGateway).mockReturnValue({
    me: jest
      .fn()
      .mockResolvedValue({ id: 'another-uid', username: 'other-name' }),
  } as never);
  jest.mocked(loadSession).mockResolvedValue({
    accessToken: 'token',
    user: { ...user, uid: 'another-uid' },
  });
  await persistProfileIdentity(profile);
  expect(saveSession).not.toHaveBeenCalled();
});

it('updates the stored name while preserving credentials and other identity fields', async () => {
  jest
    .mocked(loadSession)
    .mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { ...user, username: 'old-name' },
    });
  await persistProfileIdentity({ ...profile, displayName: 'María Pérez' });
  expect(saveSession).toHaveBeenCalledWith({
    accessToken: 'token',
    refreshToken: 'refresh',
    user: {
      ...user,
      id: 'uid',
      username: 'chosen-name',
      displayName: 'María Pérez',
    },
  });
});

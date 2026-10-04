import { userProfileServices } from '../../src/infrastructure/user-profile-services';
import { createConfiguredContext } from '@quarks.studio/config/http';
import { persistProfileIdentity } from '../../src/infrastructure/profile-session';

jest.mock('@quarks.studio/config/http', () => ({
  createConfiguredContext: jest.fn(),
}));
jest.mock('../../src/infrastructure/profile-session', () => ({
  persistProfileIdentity: jest.fn(),
}));
const fetchJson = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(createConfiguredContext).mockReturnValue({ fetchJson } as never);
});
it('uses direct server routes and filters packages with the stable UID', async () => {
  const profile = {
    id: 'firebase-uid',
    username: 'alice',
    photoURL: null,
    createdAt: null,
  };
  fetchJson
    .mockResolvedValueOnce(profile)
    .mockResolvedValueOnce({ items: [], totalCount: 0, nextCursor: null });
  const services = userProfileServices('https://registry.test/v1');
  const loaded = await services.getProfile('alice');
  await services.getPackages(loaded.id, 'next');
  expect(createConfiguredContext).toHaveBeenCalledWith(
    'https://registry.test/v1',
  );
  expect(fetchJson.mock.calls[0][0]).toBe('users/alice');
  const query = new URLSearchParams(fetchJson.mock.calls[1][0].split('?')[1]);
  expect(query.get('author')).toBe('firebase-uid');
  expect(query.get('limit')).toBe('24');
  expect(query.get('cursor')).toBe('next');
  expect(fetchJson.mock.calls.every(([path]) => !path.includes('/api/'))).toBe(
    true,
  );
});
it('persists the returned identity after username update succeeds', async () => {
  const profile = {
    id: 'firebase-uid',
    username: 'renamed',
    photoURL: null,
    createdAt: null,
  };
  fetchJson.mockResolvedValue(profile);
  await expect(
    userProfileServices().updateUsername('renamed'),
  ).resolves.toEqual(profile);
  expect(fetchJson).toHaveBeenCalledWith('auth/me', {
    method: 'POST',
    body: { username: 'renamed' },
  });
  expect(persistProfileIdentity).toHaveBeenCalledWith(profile);
});

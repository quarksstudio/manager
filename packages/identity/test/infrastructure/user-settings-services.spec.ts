import { createConfiguredContext } from '@quarks.studio/config/http';
import { userSettingsServices } from '../../src/infrastructure/user-settings-services';
import { persistProfileIdentity } from '../../src/infrastructure/profile-session';
jest.mock('@quarks.studio/config/http', () => ({
  createConfiguredContext: jest.fn(),
}));
jest.mock('../../src/infrastructure/profile-session', () => ({
  persistProfileIdentity: jest.fn(),
}));
it('loads and updates the authenticated profile and persists the returned identity', async () => {
  const profile = {
    id: 'uid',
    username: 'alice',
    displayName: 'Alice',
    createdAt: null,
    photoURL: null,
  };
  const fetchJson = jest.fn().mockResolvedValue(profile);
  jest.mocked(createConfiguredContext).mockReturnValue({ fetchJson } as never);
  const services = userSettingsServices('https://api.test');
  await expect(services.get()).resolves.toEqual(profile);
  expect(fetchJson).toHaveBeenCalledWith('auth/me');
  await expect(services.update({ displayName: 'Alice' })).resolves.toEqual(
    profile,
  );
  expect(fetchJson).toHaveBeenLastCalledWith('auth/me', {
    method: 'POST',
    body: { displayName: 'Alice' },
  });
  expect(persistProfileIdentity).toHaveBeenCalledWith(profile);
});

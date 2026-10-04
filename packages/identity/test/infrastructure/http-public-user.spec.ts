import { createHttpPublicUsers } from '../../src/http';
import type { OperationContext } from '@quarks.studio/registry/http';

it('encodes the user identifier without changing it', async () => {
  const fetchJson = jest
    .fn()
    .mockResolvedValue({ id: 'user/id +?', photoURL: null, createdAt: null });
  const users = createHttpPublicUsers({
    fetchJson,
  } as unknown as OperationContext);
  await expect(users.get('user/id +?')).resolves.toMatchObject({
    id: 'user/id +?',
  });
  expect(fetchJson).toHaveBeenCalledWith('users/user%2Fid%20%2B%3F');
});

it('updates only username through auth/me', async () => {
  const fetchJson = jest
    .fn()
    .mockResolvedValue({
      id: 'uid',
      username: 'alice',
      photoURL: null,
      createdAt: null,
    });
  const users = createHttpPublicUsers({
    fetchJson,
  } as unknown as OperationContext);
  await expect(users.update('alice')).resolves.toMatchObject({
    username: 'alice',
  });
  expect(fetchJson).toHaveBeenCalledWith('auth/me', {
    method: 'POST',
    body: { username: 'alice' },
  });
});

import { me, logout } from './Auth';

describe('authentication routes', () => {
  it('uses the auth namespace for identity and logout', async () => {
    const client = { _fetch: jest.fn().mockResolvedValue({ success: true }) };
    await me.call(client);
    await logout.call(client);
    expect(client._fetch.mock.calls).toEqual([
      ['auth/me'],
      ['auth/logout', { method: 'POST' }],
    ]);
  });
});

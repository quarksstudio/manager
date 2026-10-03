import { createHttpIdentityGateway } from '../../src/http';
import type { OperationContext } from '@quarks.studio/types/http';

const fetchJson = jest.fn();
const gateway = createHttpIdentityGateway({
  fetchJson,
} as unknown as OperationContext);

describe('the HTTP identity gateway', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exchanges a provider token for the server session', async () => {
    fetchJson.mockResolvedValue({});

    await gateway.exchange('id-token');

    expect(fetchJson).toHaveBeenCalledWith('auth/exchange', {
      method: 'POST',
      body: { token: 'id-token' },
    });
  });

  it('forwards the refresh token only when the host supplied one', async () => {
    fetchJson.mockResolvedValue({});

    await gateway.exchange('id-token', 'refresh');

    // A login has no refresh token yet, so the key is absent rather than empty.
    expect(fetchJson).toHaveBeenCalledWith('auth/exchange', {
      method: 'POST',
      body: { token: 'id-token', refreshToken: 'refresh' },
    });
  });

  it('reads the current user and posts the logout', async () => {
    fetchJson.mockResolvedValue({ uid: 'user-1' });

    await expect(gateway.me()).resolves.toEqual({ uid: 'user-1' });
    expect(fetchJson).toHaveBeenLastCalledWith('auth/me');

    await gateway.logout();
    expect(fetchJson).toHaveBeenLastCalledWith('auth/logout', {
      method: 'POST',
    });
  });
});

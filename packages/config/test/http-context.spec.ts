jest.mock('../../storage/src/infrastructure/create-storage', () => jest.requireMock('@quarks.studio/storage'));
import { resetConfig } from '@quarks.studio/config';

import {
  AUTH_SESSION_KEY,
  apiFetch,
  apiRequest,
} from '../src/http';

jest.mock('@quarks.studio/storage', () => {
  const values = new Map<string, unknown>();
  const auth = {
    getItem: jest.fn(),
    removeItem: jest.fn(),
  };
  const cache = {
    getItem: jest.fn((key: string, options?: { force?: boolean }) =>
      Promise.resolve(options?.force ? null : (values.get(key) ?? null)),
    ),
    setItem: jest.fn((key: string, value: unknown) => {
      values.set(key, value);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      values.clear();
      return Promise.resolve();
    }),
  };
  return {
    createStorage: jest.fn(({ namespace }: { namespace: string }) =>
      namespace === 'api-cache' ? cache : auth,
    ),
    __auth: auth,
    __cache: cache,
    __reset: () => values.clear(),
  };
});

const storageMocks = jest.requireMock('@quarks.studio/storage') as {
  __auth: { getItem: jest.Mock; removeItem: jest.Mock };
  __cache: { getItem: jest.Mock; setItem: jest.Mock; clear: jest.Mock };
  __reset: () => void;
};
const storage = storageMocks.__auth;
const cache = storageMocks.__cache;

describe('apiFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // `loadConfig` is memoized, so every case must re-resolve the token.
    resetConfig();
    storageMocks.__reset();
    storage.getItem.mockResolvedValue(null);
    storage.removeItem.mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('injects the stored access token into outgoing requests', async () => {
    storage.getItem.mockResolvedValue({ accessToken: 'mock_token' });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'private-package' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiFetch('https://api.test/package')).resolves.toEqual({
      id: 'private-package',
    });

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer mock_token');
    expect(storage.getItem).toHaveBeenCalledWith(AUTH_SESSION_KEY);
  });

  it('omits authorization for guests and skipAuth requests', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response('{}', { status: 200 }));

    await apiFetch('https://api.test/public');
    storage.getItem.mockResolvedValue({ accessToken: 'ignored' });
    await apiFetch('https://api.test/login', { skipAuth: true });

    expect(
      new Headers(fetchMock.mock.calls[0][1]?.headers).has('Authorization'),
    ).toBe(false);
    expect(
      new Headers(fetchMock.mock.calls[1][1]?.headers).has('Authorization'),
    ).toBe(false);
  });

  it('preserves a caller-provided authorization header', async () => {
    storage.getItem.mockResolvedValue({ accessToken: 'stored' });
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await apiRequest('https://api.test/package', {
      headers: { Authorization: 'Bearer explicit' },
    });

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer explicit');
  });

  it('clears an invalid session after a 401 response', async () => {
    storage.getItem.mockResolvedValue({ accessToken: 'expired' });
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 401,
        statusText: 'Unauthorized',
      }),
    );

    await expect(apiFetch('https://api.test/private')).rejects.toThrow(
      'API request failed with status 401: Unauthorized',
    );
    expect(storage.removeItem).toHaveBeenCalledWith(AUTH_SESSION_KEY);
  });

  it('returns a valid cached response before making another request', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(
        async () => new Response(JSON.stringify({ cached: true })),
      );

    await expect(
      apiFetch('https://api.test/packages', { useCache: true }),
    ).resolves.toEqual({ cached: true });
    await expect(
      apiFetch('https://api.test/packages', { useCache: true }),
    ).resolves.toEqual({ cached: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cache.setItem).toHaveBeenCalledTimes(1);
  });

  it('bypasses a cache hit with force true', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response(JSON.stringify({ ok: 1 })));

    await apiFetch('https://api.test/packages', { useCache: true });
    await apiFetch('https://api.test/packages', {
      force: true,
      useCache: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not touch the cache unless the caller opts in', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(
        async () => new Response(JSON.stringify({ fresh: true })),
      );

    await apiFetch('https://api.test/packages');
    await apiFetch('https://api.test/packages');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cache.getItem).not.toHaveBeenCalled();
    expect(cache.setItem).not.toHaveBeenCalled();
    // A response that is not ours to reuse must not come from anywhere else.
    expect(fetchMock.mock.calls[0][1]?.cache).toBe('no-store');
  });

  it('falls back to the network when cache access fails', async () => {
    cache.getItem.mockRejectedValueOnce(new Error('Cache unavailable'));
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ fresh: true })));

    await expect(
      apiFetch('https://api.test/packages', { useCache: true }),
    ).resolves.toEqual({ fresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches binary responses and invalidates cache after mutations', async () => {
    const bytes = Uint8Array.from([0, 255, 10, 20]);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (_endpoint, options) =>
        options?.method === 'POST' ? new Response('{}') : new Response(bytes),
      );

    const first = await apiRequest('https://api.test/bundle', {
      useCache: true,
    });
    const second = await apiRequest('https://api.test/bundle', {
      useCache: true,
    });
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(bytes);
    expect(new Uint8Array(await second.arrayBuffer())).toEqual(bytes);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await apiRequest('https://api.test/package', { method: 'POST' });
    expect(cache.clear).toHaveBeenCalledTimes(1);
  });
});

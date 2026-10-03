/** @jest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';

import {
  useAuthLogin,
  useAuthLogout,
  useCurrentUser,
  useFetchPackage,
  usePackageCertifications,
  usePackageReadme,
  usePaymentLink,
  useSearchPackages,
  useUpdatePackageMetadata,
} from '../src/hooks';

jest.mock('../src/composition/ambient-client', () => {
  const api = {
    search: jest.fn(),
    get: jest.fn(),
    getReadme: jest.fn(),
    update: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
  };
  return {
    Client: jest.fn(() => ({
      Packages: {
        search: api.search,
        get: api.get,
        getReadme: api.getReadme,
        update: api.update,
      },
      Auth: { me: api.me, logout: api.logout },
    })),
    __api: api,
  };
});

jest.mock('@quarks.studio/use-storage/storage', () => ({
  createStorage: () => ({ removeItem: mockRemoveSession }),
}));
const mockRemoveSession = jest.fn();

jest.mock('../src/composition/ambient-search', () => ({
  searchPackages: jest.fn(),
  fetchRemotePackages: jest.fn(),
}));

jest.mock('../src/composition/ambient-login', () => ({
  loginWithProvider: jest.fn(),
  submitManualLoginCode: jest.fn(),
}));

const authApi = jest.requireMock('../src/composition/ambient-login') as {
  loginWithProvider: jest.Mock;
  submitManualLoginCode: jest.Mock;
};

const hybridApi = jest.requireMock('../src/composition/ambient-search') as {
  searchPackages: jest.Mock;
  fetchRemotePackages: jest.Mock;
};

const api = (
  jest.requireMock('../src/composition/ambient-client') as {
    __api: {
      search: jest.Mock;
      get: jest.Mock;
      getReadme: jest.Mock;
      update: jest.Mock;
      me: jest.Mock;
      logout: jest.Mock;
    };
  }
).__api;

describe('registry hooks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs out and clears the session without fetching a profile', async () => {
    api.logout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuthLogout());
    await act(async () => result.current.logout());
    expect(api.me).not.toHaveBeenCalled();
    expect(mockRemoveSession).toHaveBeenCalledWith('auth:session');
    expect(result.current.status).toBe('success');
  });

  it('reports logout failures to the caller', async () => {
    api.logout.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAuthLogout());
    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow('offline');
    });
    expect(result.current.status).toBe('error');
  });

  it('renders local results before merging remote results', async () => {
    let resolveRemote!: (value: unknown) => void;
    const remote = new Promise((resolve) => (resolveRemote = resolve));
    hybridApi.searchPackages.mockResolvedValue({
      localResults: [item('local')],
      remote,
    });
    const { result } = renderHook(() => useSearchPackages({ query: 'skill' }));

    await waitFor(() =>
      expect(result.current.localResults).toEqual([item('local')]),
    );
    expect(result.current.combinedResults).toEqual([item('local')]);
    await act(async () =>
      resolveRemote({
        items: [item('remote')],
        totalCount: 2,
        nextCursor: null,
      }),
    );
    await waitFor(() => expect(result.current.isSearchingRemote).toBe(false));
    expect(result.current.hasMoreRemoteResults).toBe(true);
    await act(async () => result.current.loadRemoteResults());
    expect(result.current.combinedResults).toEqual([
      item('local'),
      item('remote'),
    ]);
  });

  it('fetches a package and supports refetching', async () => {
    api.get.mockResolvedValue({ id: '@scope/private' });
    const { result } = renderHook(() => useFetchPackage('@scope/private'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.refetch());
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(result.current.data).toEqual({ id: '@scope/private' });
  });

  it('loads the authenticated user and exposes failures', async () => {
    api.me.mockRejectedValue(new Error('Unauthorized'));
    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(new Error('Unauthorized'));
  });

  it('fetches a readme for a given version', async () => {
    api.getReadme.mockResolvedValue({ content: '# docs' });
    const { result } = renderHook(() => usePackageReadme('demo', '1.0.0'));

    await waitFor(() =>
      expect(result.current.data).toEqual({ content: '# docs' }),
    );
    expect(api.getReadme).toHaveBeenCalledWith('demo', '1.0.0');
    expect(result.current.loading).toBe(false);
  });

  it('skips fetching a readme when no version is selected', () => {
    const { result } = renderHook(() => usePackageReadme('demo'));

    expect(result.current.loading).toBe(false);
    expect(api.getReadme).not.toHaveBeenCalled();
  });

  it('derives certifications for the selected version', async () => {
    api.get.mockResolvedValue({
      id: 'demo',
      versions: [
        {
          version: '2.0.0',
          certifications: [
            { tier: 'TIER_4', status: 'approved' },
            { tier: 'TIER_1', status: 'approved' },
          ],
        },
        {
          version: '1.0.0',
          certifications: [{ tier: 'TIER_2', status: 'pending' }],
        },
      ],
    });
    const { result } = renderHook(() =>
      usePackageCertifications('demo', '1.0.0'),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.latestVersion).toBe('2.0.0');
    expect(result.current.data).toEqual([
      { tier: 'TIER_2', status: 'pending' },
    ]);
  });

  it('falls back to the latest version for certifications', async () => {
    api.get.mockResolvedValue({
      id: 'demo',
      versions: [
        {
          version: '2.0.0',
          certifications: [{ tier: 'TIER_1', status: 'approved' }],
        },
        { version: '1.0.0' },
      ],
    });
    const { result } = renderHook(() => usePackageCertifications('demo'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([
      { tier: 'TIER_1', status: 'approved' },
    ]);
  });

  it('persists metadata updates and reports the status', async () => {
    api.update.mockResolvedValue({ id: 'demo' });
    const { result } = renderHook(() => useUpdatePackageMetadata());

    await act(async () =>
      result.current.save({
        id: 'demo',
        description: 'new',
        tags: ['demo'],
        authors: ['alice'],
      }),
    );
    expect(api.update).toHaveBeenCalledWith({
      id: 'demo',
      description: 'new',
      tags: ['demo'],
      authors: ['alice'],
    });
    expect(result.current.status).toBe('success');
    expect(result.current.error).toBeNull();
  });

  it('surfaces metadata update failures', async () => {
    api.update.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useUpdatePackageMetadata());

    await act(async () => {
      await expect(
        result.current.save({
          id: 'demo',
          description: 'new',
          tags: [],
          authors: ['alice'],
        }),
      ).rejects.toThrow('offline');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual(new Error('offline'));
  });
});

describe('useAuthLogin', () => {
  it('tracks authentication steps and the authenticated user', async () => {
    const session = {
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        uid: 'user-1',
        email: null,
        displayName: 'User',
        photoURL: null,
      },
    };
    authApi.loginWithProvider.mockImplementation(
      async (_options: unknown, onStep: (step: string) => void) => {
        onStep('opening-browser');
        onStep('authenticated');
        return session;
      },
    );
    const { result } = renderHook(() => useAuthLogin());

    await act(async () => {
      await result.current.login({ provider: 'google' });
    });

    expect(result.current).toMatchObject({
      currentStep: 'authenticated',
      isLoading: false,
      isAuthenticated: true,
      user: session.user,
      error: null,
    });
    await act(async () => result.current.submitManualCode('code'));
    expect(authApi.submitManualLoginCode).toHaveBeenCalledWith('code');
  });
});

describe('usePaymentLink', () => {
  const REGISTRY = 'https://registry.test/v1';
  const navigate = jest.fn();
  const plan = {
    kind: 'plan',
    packageId: 'demo',
    productId: 'PL1',
    system: 'paypal',
  } as const;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    navigate.mockReset();
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  const answer = (body: unknown, status = 200) =>
    fetchMock.mockResolvedValue({
      status,
      ok: status >= 200 && status < 300,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => body,
    });

  it('asks the gateway for the hosted page and forwards the payer there', async () => {
    answer({
      system: 'paypal',
      url: 'https://paypal.test/checkout',
      reference: 'ref-1',
    });
    const { result } = renderHook(() =>
      usePaymentLink({ apiBaseUrl: REGISTRY, navigate }),
    );

    await act(async () => {
      await result.current.pay(plan);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${REGISTRY}/gateway/paypal/PL1/demo`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(navigate).toHaveBeenCalledWith('https://paypal.test/checkout');
    expect(result.current).toMatchObject({ failure: null, isPaying: false });
  });

  it('names the failure instead of writing the payer a sentence', async () => {
    answer({}, 401);
    const { result } = renderHook(() =>
      usePaymentLink({ apiBaseUrl: REGISTRY, navigate }),
    );

    await act(async () => {
      await result.current.pay(plan);
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.failure).toBe('unauthenticated');
  });
});

function item(name: string) {
  return { name, version: '1.0.0', description: `${name} skill` };
}

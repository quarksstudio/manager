/** @jest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';

import {
  useAuthLogin,
  useCurrentUser,
  useFetchPackage,
  useSearchPackages,
} from './hooks';

jest.mock('./lib', () => {
  const api = {
    search: jest.fn(),
    get: jest.fn(),
    me: jest.fn(),
  };
  return {
    Client: jest.fn(() => ({
      Packages: { search: api.search, get: api.get },
      Auth: { me: api.me },
    })),
    __api: api,
  };
});

jest.mock('./search-packages', () => ({
  searchPackages: jest.fn(),
  fetchRemotePackages: jest.fn(),
}));

jest.mock('./auth-login', () => ({
  loginWithProvider: jest.fn(),
  submitManualLoginCode: jest.fn(),
}));

const authApi = jest.requireMock('./auth-login') as {
  loginWithProvider: jest.Mock;
  submitManualLoginCode: jest.Mock;
};

const hybridApi = jest.requireMock('./search-packages') as {
  searchPackages: jest.Mock;
  fetchRemotePackages: jest.Mock;
};

const api = (
  jest.requireMock('./lib') as {
    __api: { search: jest.Mock; get: jest.Mock; me: jest.Mock };
  }
).__api;

describe('registry hooks', () => {
  beforeEach(() => jest.clearAllMocks());

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

function item(name: string) {
  return { name, version: '1.0.0', description: `${name} skill` };
}

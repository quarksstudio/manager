/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuthLogin, useAuthLogout, useCurrentUser } from '../../src/hooks';
const mockRemoveSession = jest.fn();
const authApi = {
  loginWithProvider: jest.fn(),
  loginWithLocalEmulator: jest.fn(),
  submitManualLoginCode: jest.fn(),
};
const api = { me: jest.fn(), logout: jest.fn() };
const services = {
  ...authApi,
  ...api,
  clearSession: async () => {
    await mockRemoveSession('auth:session');
  },
};
beforeEach(() => jest.clearAllMocks());
it('logs out and clears the session without fetching a profile', async () => {
  api.logout.mockResolvedValue(undefined);
  const { result } = renderHook(() => useAuthLogout(services));
  await act(async () => result.current.logout());
  expect(api.me).not.toHaveBeenCalled();
  expect(mockRemoveSession).toHaveBeenCalledWith('auth:session');
  expect(result.current.status).toBe('success');
});
it('reports logout failures to the caller', async () => {
  api.logout.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useAuthLogout(services));
  await act(async () => {
    await expect(result.current.logout()).rejects.toThrow('offline');
  });
  expect(result.current.status).toBe('error');
});
it('loads the authenticated user and exposes failures', async () => {
  api.me.mockRejectedValue(new Error('Unauthorized'));
  const { result } = renderHook(() => useCurrentUser(services));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toBeNull();
  expect(result.current.error).toEqual(new Error('Unauthorized'));
});
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
  const { result } = renderHook(() => useAuthLogin(services));

  await act(async () => {
    await result.current.login('google', { strategy: 'deep-link' });
  });

  expect(authApi.loginWithProvider).toHaveBeenCalledWith(
    { provider: 'google', strategy: 'deep-link' },
    expect.any(Function),
  );
  expect(authApi.loginWithLocalEmulator).not.toHaveBeenCalled();
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

it('shares an in-flight emulator login and updates the authenticated user', async () => {
  const session = {
    accessToken: 'token',
    refreshToken: 'refresh',
    user: {
      uid: 'developer',
      email: 'developer@quark.local',
      displayName: 'developer',
      photoURL: null,
    },
  };
  let complete!: (value: typeof session) => void;
  authApi.loginWithLocalEmulator.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  const { result } = renderHook(() => useAuthLogin(services));
  let first!: Promise<unknown>;
  act(() => {
    first = result.current.login('emulator');
    expect(result.current.login('emulator')).toBe(first);
  });
  expect(authApi.loginWithLocalEmulator).toHaveBeenCalledTimes(1);
  expect(result.current.isLoading).toBe(true);
  await act(async () => {
    complete(session);
    await first;
  });
  expect(result.current).toMatchObject({
    isAuthenticated: true,
    user: session.user,
    isLoading: false,
    error: null,
  });
});

it('reports emulator failures and allows another attempt', async () => {
  authApi.loginWithLocalEmulator.mockRejectedValueOnce(
    new Error('Local login failed'),
  );
  const { result } = renderHook(() => useAuthLogin(services));
  await act(async () => {
    await expect(result.current.login('emulator')).rejects.toThrow(
      'Local login failed',
    );
  });
  expect(result.current).toMatchObject({
    isLoading: false,
    isAuthenticated: false,
    currentStep: 'idle',
    error: new Error('Local login failed'),
  });
  authApi.loginWithLocalEmulator.mockResolvedValue({
    accessToken: 'token',
    refreshToken: 'refresh',
    user: { uid: 'developer' },
  });
  await act(async () => {
    await result.current.login('emulator');
  });
  expect(result.current.isAuthenticated).toBe(true);
  expect(result.current.error).toBeNull();
});

it('does not restore authentication when a pending emulator login completes after reset', async () => {
  let complete!: (value: unknown) => void;
  authApi.loginWithLocalEmulator.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  const { result } = renderHook(() => useAuthLogin(services));
  let request!: Promise<unknown>;
  act(() => {
    request = result.current.login('emulator');
  });
  act(() => result.current.reset());
  await act(async () => {
    complete({ accessToken: 'token', user: { uid: 'developer' } });
    await request;
  });
  expect(result.current).toMatchObject({
    currentStep: 'idle',
    isLoading: false,
    isAuthenticated: false,
    user: null,
  });
});

it('keeps the newer provider session when an older emulator request finishes', async () => {
  let complete!: (value: unknown) => void;
  authApi.loginWithLocalEmulator.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  const session = {
    accessToken: 'provider-token',
    user: { uid: 'google-user' },
  };
  authApi.loginWithProvider.mockResolvedValue(session);
  const { result } = renderHook(() => useAuthLogin(services));
  let request!: Promise<unknown>;
  act(() => {
    request = result.current.login('emulator');
  });
  await act(async () => {
    await result.current.login('google');
  });
  await act(async () => {
    complete({ accessToken: 'local-token', user: { uid: 'developer' } });
    await request;
  });
  expect(result.current).toMatchObject({
    isAuthenticated: true,
    user: session.user,
    isLoading: false,
  });
});

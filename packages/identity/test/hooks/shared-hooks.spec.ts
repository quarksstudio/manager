/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuthLogin, useAuthLogout, useCurrentUser } from '../../src/hooks';
const mockRemoveSession = jest.fn();
const authApi = {
  loginWithProvider: jest.fn(),
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

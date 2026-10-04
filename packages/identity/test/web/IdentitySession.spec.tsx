import { act, renderHook, waitFor } from '@testing-library/react';
import {
  saveSession,
  clearSession,
  resetStore,
  APP_NAME,
  AUTH_SESSION_KEY,
} from '@quarks.studio/config';
import { createGlobalContext } from '@quarks.studio/config/http';
import { useIdentitySession } from '../../src/hooks/useIdentitySession';
import {
  getSession,
  getAccessToken,
  isAuthenticated,
} from '../../src/configured';

beforeEach(async () => {
  localStorage.clear();
  resetStore();
  await clearSession();
});

it('reads storage and reacts to login, logout, and expired sessions on focus', async () => {
  const { result } = renderHook(() => useIdentitySession());
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.isAuthenticated).toBe(false);
  expect(await getSession()).toBeNull();
  expect(await getAccessToken()).toBeNull();
  expect(await isAuthenticated()).toBe(false);

  await act(async () => {
    await saveSession({ accessToken: 'stored-token' });
  });
  await waitFor(() => expect(result.current.accessToken).toBe('stored-token'));
  expect(await getSession()).toEqual({ accessToken: 'stored-token' });
  expect(await getAccessToken()).toBe('stored-token');
  expect(await isAuthenticated()).toBe(true);

  await act(async () => {
    await clearSession();
  });
  await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
  await act(async () => {
    await saveSession({ accessToken: 'expires' }, 1);
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  await waitFor(() => expect(result.current.accessToken).toBeNull());
  expect(await getSession()).toBeNull();
});

it('reloads changes made by another tab', async () => {
  const { result } = renderHook(() => useIdentitySession());
  await waitFor(() => expect(result.current.loading).toBe(false));
  localStorage.setItem(
    `${APP_NAME}:${AUTH_SESSION_KEY}`,
    JSON.stringify({
      createdAt: Date.now(),
      expiresAt: null,
      value: { accessToken: 'other-tab' },
    }),
  );
  await act(async () => {
    window.dispatchEvent(
      new StorageEvent('storage', { key: `${APP_NAME}:${AUTH_SESSION_KEY}` }),
    );
  });
  await waitFor(() => expect(result.current.accessToken).toBe('other-tab'));
});

it('updates when the configured transport clears a rejected session on 401', async () => {
  await saveSession({ accessToken: 'rejected-token' });
  const { result } = renderHook(() => useIdentitySession());
  await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
  // jsdom does not supply fetch; the configured transport uses this stub.
  const original = globalThis.fetch;
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue({ status: 401, ok: false, statusText: 'Unauthorized' });
  try {
    await act(async () => {
      const context = await createGlobalContext({
        baseUrl: 'http://registry.test/v1',
      });
      await expect(context.request('auth/me')).rejects.toThrow();
    });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
  } finally {
    globalThis.fetch = original;
  }
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { loadSession } from '@quarks.studio/config';
import { useIdentitySession } from '../../src/hooks/useIdentitySession';
import {
  getSession,
  getAccessToken,
  isAuthenticated,
} from '../../src/configured';

jest.mock('@quarks.studio/config', () => ({
  ...jest.requireActual('@quarks.studio/config'),
  loadSession: jest.fn(),
}));
const load = loadSession as jest.Mock;
beforeEach(() => load.mockReset());

it.each(['', '   '])(
  'treats an empty token as unauthenticated (%s)',
  async (accessToken) => {
    load.mockResolvedValue({ accessToken });
    expect(await getAccessToken()).toBeNull();
    expect(await isAuthenticated()).toBe(false);
    const { result } = renderHook(() => useIdentitySession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accessToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  },
);

it('exposes storage failures and clears the error after recovery', async () => {
  load.mockRejectedValue(new Error('Storage failed'));
  for (const read of [getSession, getAccessToken, isAuthenticated]) {
    await expect(read()).rejects.toThrow('Storage failed');
  }
  const { result } = renderHook(() => useIdentitySession());
  await waitFor(() =>
    expect(result.current.error?.message).toBe('Storage failed'),
  );
  expect(result.current.session).toBeNull();
  expect(result.current.accessToken).toBeNull();
  expect(result.current.isAuthenticated).toBe(false);
  load.mockResolvedValue({ accessToken: 'recovered' });
  await act(async () => {
    await result.current.reload();
  });
  expect(result.current.error).toBeNull();
  expect(result.current.accessToken).toBe('recovered');
});

it('ignores obsolete reads and reads completed after unmount', async () => {
  let finish!: (value: unknown) => void;
  load.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { result, unmount } = renderHook(() => useIdentitySession());
  load.mockResolvedValue({ accessToken: 'newest' });
  await act(async () => {
    await result.current.reload();
  });
  await act(async () => {
    finish({ accessToken: 'obsolete' });
  });
  expect(result.current.accessToken).toBe('newest');
  load.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.reload();
  });
  unmount();
  await act(async () => {
    finish({ accessToken: 'unmounted' });
    await pending;
  });
});

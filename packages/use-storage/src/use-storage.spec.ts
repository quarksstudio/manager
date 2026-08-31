/** @jest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';

import { useStorage } from './use-storage';

describe('useStorage', () => {
  beforeEach(() => localStorage.clear());

  it('hydrates, updates and removes persistent state', async () => {
    const { result } = renderHook(() =>
      useStorage('theme', 'light', { namespace: 'settings' }),
    );

    await act(async () => result.current[1]('dark'));
    expect(result.current[0]).toBe('dark');
    expect(result.current[3].lastUpdated).toEqual(expect.any(Number));

    await act(async () => result.current[1]((current) => `${current}!`));
    expect(result.current[0]).toBe('dark!');

    await act(async () => result.current[2]());
    expect(result.current[0]).toBe('light');
    expect(result.current[3]).toEqual({
      isExpired: false,
      lastUpdated: null,
    });
  });

  it('reacts to browser storage events from another tab', async () => {
    const { result } = renderHook(() =>
      useStorage('theme', 'light', { namespace: 'settings' }),
    );
    const createdAt = Date.now();
    localStorage.setItem(
      'settings:theme',
      JSON.stringify({ value: 'dark', createdAt, expiresAt: null }),
    );

    act(() => window.dispatchEvent(new StorageEvent('storage')));

    await waitFor(() => expect(result.current[0]).toBe('dark'));
    expect(result.current[3].lastUpdated).toBe(createdAt);
  });

  it('reports expiration and restores the initial value', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const { result } = renderHook(() => useStorage('api', 'empty'));
    await act(async () => result.current[1]('cached', 10));

    jest.advanceTimersByTime(11);
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage'));
      await Promise.resolve();
    });

    expect(result.current[0]).toBe('empty');
    expect(result.current[3]).toEqual({
      isExpired: true,
      lastUpdated: null,
    });
    jest.useRealTimers();
  });
});

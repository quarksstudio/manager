import React from 'react';
import {
  DistributionProvider,
  type DistributionServices,
} from '@quarks.studio/distribution/presentation';
import {
  act,
  renderHook as renderHookWithServices,
} from '@testing-library/react';

import { apiCache, cacheKey } from '../../../src/presentation/storage';
import { useReadmeCached } from '../../../src/hooks/useReadmeCached';

const mockGetReadme = jest.fn();

const services: DistributionServices = {
  get: jest.fn(),
  getReadme: mockGetReadme,
  update: jest.fn(),
  downloadBundle: jest.fn(),
  getCurrentUser: jest.fn(),
};

const renderHook: typeof renderHookWithServices = (callback, options) =>
  renderHookWithServices(callback, {
    ...options,
    wrapper: ({ children }) =>
      React.createElement(DistributionProvider, { services, children }),
  });

const README = { content: '# Hello' };

beforeEach(async () => {
  mockGetReadme.mockReset();
  await apiCache.clear();
});

describe('useReadmeCached', () => {
  it('fetches on cache miss', async () => {
    mockGetReadme.mockResolvedValue(README);
    const { result } = renderHook(() => useReadmeCached('pkg', '1.0.0'));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.data).toEqual(README);
    expect(mockGetReadme).toHaveBeenCalledWith('pkg', '1.0.0');
  });

  it('serves from cache without fetching', async () => {
    await apiCache.setItem(cacheKey('readme', 'pkg@1.0.0'), README);
    const { result } = renderHook(() => useReadmeCached('pkg', '1.0.0'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.data).toEqual(README);
    expect(mockGetReadme).not.toHaveBeenCalled();
  });

  it('refetches after clearing the cache entry', async () => {
    mockGetReadme.mockResolvedValue(README);
    const { result } = renderHook(() => useReadmeCached('pkg', '1.0.0'));
    await act(async () => {
      await Promise.resolve();
    });
    mockGetReadme.mockClear();
    mockGetReadme.mockResolvedValue({ content: '## Updated' });
    await act(async () => {
      result.current.refetch();
    });
    expect(mockGetReadme).toHaveBeenCalledTimes(1);
    expect(result.current.data?.content).toBe('## Updated');
  });

  it('does not fetch when disabled', async () => {
    const { result } = renderHook(() => useReadmeCached('pkg', undefined));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('respects TTL expiry', async () => {
    await apiCache.setItem(cacheKey('readme', 'pkg@1.0.0'), README, 100);
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 200);
    mockGetReadme.mockResolvedValue(README);
    const { result } = renderHook(() => useReadmeCached('pkg', '1.0.0'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.data).toEqual(README);
    expect(mockGetReadme).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

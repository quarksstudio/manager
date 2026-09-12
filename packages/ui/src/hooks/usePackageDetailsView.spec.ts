import { act, renderHook } from '@testing-library/react';
import { ApiError, type PackageDetails } from '@quark/registry';

import { apiCache, packageCacheKey } from '../lib/storage';
import { usePackageDetailsView } from './usePackageDetailsView';

const mockGet = jest.fn();
let mockClient: { Packages: { get: typeof mockGet } };

jest.mock('@quark/registry', () => ({
  ...jest.requireActual('@quark/registry'),
  useRegistryClient: () => mockClient,
}));

const DETAIL = {
  id: 'demo',
  description: 'Demo',
  authors: ['a'],
  tags: ['demo'],
  downloads: 10,
  canEditMetadata: false,
  versions: [
    {
      version: '1.0.0',
      certifications: [{ tier: 'TIER_2', status: 'approved' }],
    },
    {
      version: '0.5.0',
      certifications: [],
    },
  ],
} as unknown as PackageDetails;

beforeEach(async () => {
  mockGet.mockReset();
  mockClient = { Packages: { get: mockGet } };
  await apiCache.clear();
});

describe('usePackageDetailsView', () => {
  it('fetches and returns detail on cache miss', async () => {
    mockGet.mockResolvedValue(DETAIL);
    const { result } = renderHook(() => usePackageDetailsView('demo'));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.detail).toEqual(DETAIL);
    expect(result.current.latestVersion).toBe('1.0.0');
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('returns cached detail without hitting the API', async () => {
    await apiCache.setItem(packageCacheKey('demo'), DETAIL);
    const { result } = renderHook(() => usePackageDetailsView('demo'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.detail).toEqual(DETAIL);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('selects the latest version when no initialVersion', async () => {
    mockGet.mockResolvedValue(DETAIL);
    const { result } = renderHook(() => usePackageDetailsView('demo'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.selectedVersion).toBe('1.0.0');
  });

  it('selects the requested version when it exists', async () => {
    mockGet.mockResolvedValue(DETAIL);
    const { result } = renderHook(() =>
      usePackageDetailsView('demo', { initialVersion: '0.5.0' }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.selectedVersion).toBe('0.5.0');
    expect(result.current.versionNotFound).toBe(false);
    expect(result.current.requestedVersion).toBe('0.5.0');
  });

  it('sets versionNotFound when the requested version does not exist', async () => {
    mockGet.mockResolvedValue(DETAIL);
    const { result } = renderHook(() =>
      usePackageDetailsView('demo', { initialVersion: '9.9.9' }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.versionNotFound).toBe(true);
    expect(result.current.selectedVersion).toBe('');
    expect(result.current.requestedVersion).toBe('9.9.9');
  });

  it('does not set versionNotFound before detail loads', async () => {
    mockGet.mockReturnValue(new Promise<void>(() => undefined));
    const { result } = renderHook(() =>
      usePackageDetailsView('demo', { initialVersion: '9.9.9' }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.versionNotFound).toBe(false);
    expect(result.current.loading).toBe(true);
  });

  it('forwards onVersionChange when selecting', async () => {
    mockGet.mockResolvedValue(DETAIL);
    const onVersionChange = jest.fn();
    const { result } = renderHook(() =>
      usePackageDetailsView('demo', {
        initialVersion: '0.5.0',
        onVersionChange,
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    act(() => result.current.setSelectedVersion('0.5.0'));
    expect(onVersionChange).toHaveBeenCalledWith('0.5.0');
  });

  it('refetches after removing the cache entry', async () => {
    mockGet.mockResolvedValue(DETAIL);
    const { result } = renderHook(() => usePackageDetailsView('demo'));
    await act(async () => {
      await Promise.resolve();
    });
    mockGet.mockClear();
    mockGet.mockResolvedValue({
      ...DETAIL,
      downloads: 99,
    } as unknown as PackageDetails);
    await act(async () => {
      result.current.refetch();
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(result.current.detail?.downloads).toBe(99);
  });

  it('marks 404 errors as notFound', async () => {
    mockGet.mockRejectedValue(new ApiError(404, 'Not Found'));
    const { result } = renderHook(() => usePackageDetailsView('nope'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.notFound).toBe(true);
    expect(result.current.detail).toBeNull();
  });

  it('skips cache read when disabled', async () => {
    const { result } = renderHook(() => usePackageDetailsView(''));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.detail).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('respects TTL expiry', async () => {
    await apiCache.setItem(packageCacheKey('demo'), DETAIL, 100);
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 200);
    mockGet.mockResolvedValue(DETAIL);
    const { result } = renderHook(() => usePackageDetailsView('demo'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.detail).toEqual(DETAIL);
    expect(mockGet).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

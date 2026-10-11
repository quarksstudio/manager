/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  useFetchPackage,
  usePackageCertifications,
  useUpdatePackageMetadata,
} from '../../src/hooks';
const api = { get: jest.fn(), getVersion: jest.fn(), update: jest.fn() };
const services = {
  ...api,
  downloadBundle: jest.fn(),
  getCurrentUser: jest.fn(),
};
beforeEach(() => jest.clearAllMocks());
it('fetches a package and supports refetching', async () => {
  api.get.mockResolvedValue({ id: '@scope/private' });
  const { result } = renderHook(() =>
    useFetchPackage('@scope/private', services),
  );
  await waitFor(() => expect(result.current.loading).toBe(false));

  act(() => result.current.refetch());
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  expect(result.current.data).toEqual({ id: '@scope/private' });
});
it('derives certifications for the selected version', async () => {
  api.get.mockResolvedValue({
    name: 'demo',
    latestVersion: '2.0.0',
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
    usePackageCertifications('demo', '1.0.0', services),
  );

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.latestVersion).toBe('2.0.0');
  expect(result.current.data).toEqual([{ tier: 'TIER_2', status: 'pending' }]);
});
it('falls back to the latest version for certifications', async () => {
  api.get.mockResolvedValue({
    name: 'demo',
    latestVersion: '2.0.0',
    versions: [
      {
        version: '2.0.0',
        certifications: [{ tier: 'TIER_1', status: 'approved' }],
      },
      { version: '1.0.0' },
    ],
  });
  const { result } = renderHook(() =>
    usePackageCertifications('demo', undefined, services),
  );

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual([{ tier: 'TIER_1', status: 'approved' }]);
});
it('persists metadata updates and reports the status', async () => {
  api.update.mockResolvedValue({ id: 'demo' });
  const { result } = renderHook(() => useUpdatePackageMetadata(services));

  await act(async () =>
    result.current.save({
      id: 'demo',
      summary: 'new',
      tags: ['demo'],
      authors: ['alice'],
    }),
  );
  expect(api.update).toHaveBeenCalledWith({
    id: 'demo',
    summary: 'new',
    tags: ['demo'],
    authors: ['alice'],
  });
  expect(result.current.status).toBe('success');
  expect(result.current.error).toBeNull();
});
it('surfaces metadata update failures', async () => {
  api.update.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useUpdatePackageMetadata(services));

  await act(async () => {
    await expect(
      result.current.save({
        id: 'demo',
        summary: 'new',
        tags: [],
        authors: ['alice'],
      }),
    ).rejects.toThrow('offline');
  });
  expect(result.current.status).toBe('error');
  expect(result.current.error).toEqual(new Error('offline'));
});

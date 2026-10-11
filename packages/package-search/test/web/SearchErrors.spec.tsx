import { act, renderHook, waitFor } from '@testing-library/react';
import { useSearchPackages } from '../../src/hooks/useSearchPackages';
jest.mock('../../src/hooks/useServices', () => ({
  useServices: (override: unknown) => override,
}));
const item = { name: 'local', version: '1.0.0', summary: 'Local package' };
it('exposes unsupported native searches while keeping local results', async () => {
  const services = {
    searchPackages: jest.fn(async () => ({
      localResults: [item],
      remote: Promise.reject({ status: 400 }),
    })),
    fetchRemotePackages: jest.fn(),
  };
  const { result } = renderHook(() => useSearchPackages({}, services));
  await waitFor(() => expect(result.current.isSearchingRemote).toBe(false));
  expect(result.current.searchError).toContain('case-sensitive name prefix');
  expect(result.current.localResults).toEqual([item]);
  services.searchPackages.mockImplementation(async () => ({
    localResults: [item],
    remote: Promise.resolve({ items: [], totalCount: 0, nextCursor: null }),
  }));
  await act(async () => result.current.search({ query: 'loc' }));
  expect(result.current.searchError).toBeNull();
});
it('keeps the current page when a cursor request fails and clears the error on reset', async () => {
  const services = {
    searchPackages: jest.fn(async () => ({
      localResults: [],
      remote: Promise.resolve({
        items: [item],
        totalCount: 2,
        nextCursor: 'next',
      }),
    })),
    fetchRemotePackages: jest.fn().mockRejectedValue({ status: 400 }),
  };
  const { result } = renderHook(() => useSearchPackages({}, services));
  await waitFor(() => expect(result.current.remoteResults).toEqual([item]));
  await act(async () => result.current.loadRemoteResults());
  expect(result.current.searchError).toContain('This search is not supported');
  expect(result.current.remoteResults).toEqual([item]);
  act(() => result.current.reset());
  expect(result.current.searchError).toBeNull();
});

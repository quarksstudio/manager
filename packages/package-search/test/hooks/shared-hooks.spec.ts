/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSearchPackages } from '../../src/hooks';
const hybridApi = { searchPackages: jest.fn(), fetchRemotePackages: jest.fn() };
const services = hybridApi;
beforeEach(() => jest.clearAllMocks());
it('renders local results before merging remote results', async () => {
  let resolveRemote!: (value: unknown) => void;
  const remote = new Promise((resolve) => (resolveRemote = resolve));
  hybridApi.searchPackages.mockResolvedValue({
    localResults: [item('local')],
    remote,
  });
  const { result } = renderHook(() =>
    useSearchPackages({ query: 'skill' }, services),
  );

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
function item(name: string) {
  return { name, version: '1.0.0', summary: name + ' skill' };
}

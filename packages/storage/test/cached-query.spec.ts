/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCachedQuery } from '../src/query';

it('ignores a pending response after the host switches keys', async () => {
  const cache = {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  };
  let finish!: (value: string) => void;
  const oldLoad = jest.fn(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  const newLoad = jest.fn(async () => 'new');
  const { result, rerender } = renderHook(
    ({ key }) =>
      useCachedQuery({
        cache,
        key,
        load: key === 'old' ? oldLoad : newLoad,
        enabled: true,
      }),
    { initialProps: { key: 'old' } },
  );
  await waitFor(() => expect(oldLoad).toHaveBeenCalledTimes(1));
  rerender({ key: 'new' });
  await waitFor(() => expect(result.current.data).toBe('new'));
  await act(async () => {
    finish('old');
  });
  expect(result.current.data).toBe('new');
  expect(cache.setItem).not.toHaveBeenCalledWith('old', 'old', undefined);
});
it('does not load when disabled and refreshes by invalidating the supplied cache', async () => {
  const cache = {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  };
  const load = jest.fn(async () => 'value');
  const { result, rerender } = renderHook(
    ({ enabled }) => useCachedQuery({ cache, key: 'key', load, enabled }),
    { initialProps: { enabled: false } },
  );
  expect(result.current.loading).toBe(false);
  expect(load).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await waitFor(() => expect(result.current.data).toBe('value'));
  act(() => result.current.refetch());
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  expect(cache.removeItem).toHaveBeenCalledWith('key');
});

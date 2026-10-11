/** @jest-environment jsdom */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { SearchScreen } from '../../src/CLI/SearchScreen';
import { PackageSearchProvider } from '../../src/presentation/services';

const exit = jest.fn();
jest.mock('ink', () => ({
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  useApp: () => ({ exit }),
}));
jest.mock('@quarks.studio/terminal-ui', () => ({
  Screen: ({ children }: any) => children,
  StatusLine: ({ message }: any) => message,
  EmptyState: ({ message }: any) => message,
  Result: ({ message }: any) => message,
}));
const services = { searchPackages: jest.fn(), fetchRemotePackages: jest.fn() };
let savedExitCode: typeof process.exitCode;
beforeEach(() => {
  jest.clearAllMocks();
  savedExitCode = process.exitCode;
});
afterEach(() => {
  process.exitCode = savedExitCode;
});
function show(props: React.ComponentProps<typeof SearchScreen> = {}) {
  return render(
    <PackageSearchProvider services={services}>
      <SearchScreen {...props} />
    </PackageSearchProvider>,
  );
}
it('waits for exactly one remote page and displays its count and next cursor', async () => {
  let resolve!: (page: unknown) => void;
  services.fetchRemotePackages.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const filters = { query: 'e2e', author: 'alice' };
  const options = { limit: 1, exact: false, matchMode: 'any' as const };
  show({ filters, options, cursor: 'previous' });
  expect(screen.getByText('Searching for "e2e"...')).toBeTruthy();
  expect(exit).not.toHaveBeenCalled();
  await act(async () =>
    resolve({
      items: [{ name: 'remote-demo', version: '1.0.0', summary: 'test' }],
      totalCount: 25,
      nextCursor: 'next-cursor',
    }),
  );
  expect(screen.getByText(/remote-demo/)).toBeTruthy();
  expect(screen.getByText(/25 total matches/)).toBeTruthy();
  expect(screen.getByText(/Next cursor: next-cursor/)).toBeTruthy();
  expect(services.fetchRemotePackages).toHaveBeenCalledWith(
    filters,
    options,
    'previous',
  );
  expect(services.fetchRemotePackages).toHaveBeenCalledTimes(1);
  expect(services.searchPackages).not.toHaveBeenCalled();
  expect(exit).toHaveBeenCalled();
});
it('renders an empty page without a next cursor and exits successfully', async () => {
  services.fetchRemotePackages.mockResolvedValue({
    items: [],
    totalCount: 0,
    nextCursor: null,
  });
  show();
  await waitFor(() =>
    expect(screen.getByText(/No matching packages found/)).toBeTruthy(),
  );
  expect(screen.queryByText(/Next cursor/)).toBeNull();
  expect(process.exitCode).toBe(savedExitCode);
  expect(exit).toHaveBeenCalled();
});
it('shows an API failure and sets a nonzero exit status', async () => {
  services.fetchRemotePackages.mockRejectedValue(
    new Error('Invalid search cursor'),
  );
  show({ cursor: 'broken' });
  await waitFor(() =>
    expect(screen.getByText('Invalid search cursor')).toBeTruthy(),
  );
  expect(process.exitCode).toBe(1);
  expect(exit).toHaveBeenCalled();
});

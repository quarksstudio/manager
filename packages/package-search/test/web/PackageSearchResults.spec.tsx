import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { packageUrl } from '../../src/web/lib/package-links';
import { PackageSearchResults } from '../../src/web/containers/PackageSearchResults';
const searchParams = jest.fn();
const services = { searchParams };
const item = (name: string) => ({
  name,
  version: '1.0.0',
  description: `${name} package`,
});
beforeEach(() => {
  jest.resetAllMocks();
  searchParams.mockResolvedValue({
    items: [item('@scope/demo')],
    totalCount: 1,
    nextCursor: null,
  });
});
function show(query = 'query=demo') {
  return render(
    <PackageSearchResults
      searchParams={query}
      services={services}
      packageUrl={(name) => `/packages/${encodeURIComponent(name)}`}
    />,
  );
}
it('renders the backend total and package cards without re-filtering', async () => {
  show('query=demo&tags=AI&tags=chat');
  expect(screen.getByRole('status').textContent).toBe('Loading packages…');
  const link = await screen.findByRole('link', { name: '@scope/demo' });
  expect(link.getAttribute('href')).toBe('/packages/%40scope%2Fdemo');
  expect(screen.getByText('1 package')).toBeTruthy();
  expect(searchParams.mock.calls[0][0].toString()).toBe(
    'query=demo&tags=AI&tags=chat',
  );
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
});
it('appends pages, preserves filters, deduplicates cards and stops at the end', async () => {
  searchParams.mockResolvedValueOnce({
    items: [item('alpha')],
    totalCount: 2,
    nextCursor: 'next',
  });
  show('query=a&tags=AI&tags=chat&cursor=start');
  await screen.findByRole('link', { name: 'alpha' });
  searchParams.mockResolvedValueOnce({
    items: [item('alpha'), item('beta')],
    totalCount: 2,
    nextCursor: null,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  await screen.findByRole('link', { name: 'beta' });
  expect(searchParams.mock.calls[1][0].toString()).toBe(
    'query=a&tags=AI&tags=chat&cursor=next',
  );
  expect(screen.getAllByRole('link')).toHaveLength(2);
  expect(screen.queryByRole('button')).toBeNull();
});
it('distinguishes an empty successful search from a failure and retries a failed page', async () => {
  searchParams.mockResolvedValueOnce({
    items: [],
    totalCount: 0,
    nextCursor: null,
  });
  const view = show('query=');
  await screen.findByText('No packages found.');
  view.unmount();
  searchParams.mockResolvedValueOnce({
    items: [item('alpha')],
    totalCount: 2,
    nextCursor: 'next',
  });
  show();
  await screen.findByRole('link', { name: 'alpha' });
  searchParams.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('link', { name: 'alpha' })).toBeTruthy();
  searchParams.mockResolvedValueOnce({
    items: [item('beta')],
    totalCount: 2,
    nextCursor: null,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('link', { name: 'beta' });
});
it('explains unsupported filters without showing an empty result or retry', async () => {
  searchParams.mockRejectedValue({ status: 400 });
  show();
  expect((await screen.findByRole('alert')).textContent).toContain(
    'This search is not supported',
  );
  expect(screen.queryByText('No packages found.')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});
it('discards pending responses when the URL query changes', async () => {
  let resolve!: (value: unknown) => void;
  searchParams.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const view = show('query=old');
  view.rerender(
    <PackageSearchResults
      searchParams="query=new"
      services={services}
      packageUrl={(name) => `/packages/${name}`}
    />,
  );
  await screen.findByRole('link', { name: '@scope/demo' });
  await act(async () =>
    resolve({ items: [item('old')], totalCount: 1, nextCursor: null }),
  );
  expect(screen.queryByRole('link', { name: 'old' })).toBeNull();
});
it('blocks repeated loads while a request is pending', async () => {
  searchParams.mockResolvedValueOnce({
    items: [item('alpha')],
    totalCount: 2,
    nextCursor: 'next',
  });
  show();
  await screen.findByRole('link', { name: 'alpha' });
  let resolve!: (value: unknown) => void;
  searchParams.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const button = screen.getByRole('button', { name: 'Load more' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(searchParams).toHaveBeenCalledTimes(2);
  await act(async () =>
    resolve({ items: [item('beta')], totalCount: 2, nextCursor: null }),
  );
  await waitFor(() =>
    expect(screen.getByRole('link', { name: 'beta' })).toBeTruthy(),
  );
});

it('builds package links for the current root routes', () => {
  expect(packageUrl('@scope/demo')).toBe('/%40scope%2Fdemo');
  expect(packageUrl('@scope/demo', '1.0.0')).toBe('/%40scope%2Fdemo/1.0.0');
});

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { UserProfile } from '../../src/web/UserProfile';

jest.mock('@quarks.studio/package-search/web', () =>
  jest.requireActual(
    '../../../package-search/src/web/components/UserPackageGrid',
  ),
);
const getProfile = jest.fn();
const getPackages = jest.fn();
const updateUsername = jest.fn();
const services = { getProfile, getPackages, updateUsername };
const profile = {
  id: 'uid-alice',
  username: 'alice',
  photoURL: null,
  createdAt: '2024-01-01T00:00:00Z',
};
const item = (name: string) => ({
  name,
  version: '1.0.0',
  description: `${name} description`,
});
let intersectCallback: IntersectionObserverCallback;
beforeEach(() => {
  jest.resetAllMocks();
  getProfile.mockResolvedValue(profile);
  getPackages.mockResolvedValue({
    items: [item('@scope/alpha')],
    totalCount: 3,
    nextCursor: 'next',
  });
  global.IntersectionObserver = jest.fn().mockImplementation((callback) => {
    intersectCallback = callback;
    return { observe: jest.fn(), disconnect: jest.fn() };
  });
});
function show(currentUserId?: string) {
  return render(
    <UserProfile
      key="alice"
      username="alice"
      services={services}
      currentUserId={currentUserId}
      packageUrl={(name) => `/packages/${encodeURIComponent(name)}`}
    />,
  );
}
async function ready() {
  await waitFor(() =>
    expect(screen.getByRole('link', { name: '@scope/alpha' })).toBeTruthy(),
  );
}
async function intersect() {
  await act(async () =>
    intersectCallback(
      [{ isIntersecting: true }] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    ),
  );
}

it('looks up the username, searches by stable UID and renders encoded package links', async () => {
  show();
  await ready();
  expect(getProfile).toHaveBeenCalledWith('alice');
  expect(getPackages).toHaveBeenCalledWith('uid-alice', undefined);
  expect(screen.getByRole('heading', { name: 'alice' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '3 Packages' })).toBeTruthy();
  expect(
    screen.getByRole('link', { name: '@scope/alpha' }).getAttribute('href'),
  ).toBe('/packages/%40scope%2Falpha');
  expect(screen.queryByRole('link', { name: 'Edit profile' })).toBeNull();
});

it('loads once per cursor, deduplicates results and stops at the last page', async () => {
  show();
  await ready();
  let resolve!: (value: unknown) => void;
  getPackages.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  await intersect();
  await intersect();
  expect(getPackages).toHaveBeenCalledTimes(2);
  expect(getPackages).toHaveBeenLastCalledWith('uid-alice', 'next');
  await act(async () =>
    resolve({
      items: [item('@scope/alpha'), item('beta')],
      totalCount: 2,
      nextCursor: null,
    }),
  );
  expect(screen.getAllByRole('link')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
});

it('keeps cards after a failed next page and retries explicitly', async () => {
  show();
  await ready();
  getPackages
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      items: [item('beta')],
      totalCount: 2,
      nextCursor: null,
    });
  await intersect();
  expect(screen.getByRole('link', { name: '@scope/alpha' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() =>
    expect(screen.getByRole('link', { name: 'beta' })).toBeTruthy(),
  );
});

it('shows a missing user without searching packages', async () => {
  getProfile.mockRejectedValue({ status: 404 });
  show();
  await waitFor(() => expect(screen.getByText('User not found.')).toBeTruthy());
  expect(getPackages).not.toHaveBeenCalled();
});

it('distinguishes an empty profile from a failed package request', async () => {
  getPackages.mockResolvedValueOnce({
    items: [],
    totalCount: 0,
    nextCursor: null,
  });
  const view = show();
  await waitFor(() =>
    expect(screen.getByText('No packages to show.')).toBeTruthy(),
  );
  view.unmount();
  getPackages.mockRejectedValueOnce(new Error('offline'));
  show();
  await waitFor(() =>
    expect(screen.getByText('Could not load packages.')).toBeTruthy(),
  );
  expect(screen.queryByText('0 Packages')).toBeNull();
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
});

it('falls back after an avatar fails and handles missing dates', async () => {
  getProfile.mockResolvedValue({
    ...profile,
    photoURL: 'https://example.test/avatar',
    createdAt: null,
  });
  show();
  await ready();
  fireEvent.error(screen.getByRole('img'));
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByText('Join date unavailable')).toBeTruthy();
});

it('supports manual loading without IntersectionObserver', async () => {
  Object.defineProperty(global, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: undefined,
  });
  show();
  await ready();
  getPackages.mockResolvedValue({
    items: [item('beta')],
    totalCount: 2,
    nextCursor: null,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  await waitFor(() =>
    expect(screen.getByRole('link', { name: 'beta' })).toBeTruthy(),
  );
});

it('retries a profile failure before searching packages', async () => {
  getProfile
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(profile);
  show();
  await waitFor(() =>
    expect(screen.getByText('Could not load profile.')).toBeTruthy(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await ready();
  expect(getProfile).toHaveBeenCalledTimes(2);
});

it('discards responses from a previous username', async () => {
  let resolve!: (value: unknown) => void;
  getProfile
    .mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    )
    .mockResolvedValueOnce({ ...profile, id: 'uid-bob', username: 'bob' });
  const view = show();
  view.rerender(
    <UserProfile
      key="bob"
      username="bob"
      services={services}
      packageUrl={(name) => `/packages/${name}`}
    />,
  );
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'bob' })).toBeTruthy(),
  );
  await act(async () => resolve(profile));
  expect(screen.queryByRole('heading', { name: 'alice' })).toBeNull();
  expect(getPackages).toHaveBeenCalledTimes(1);
  expect(getPackages).toHaveBeenCalledWith('uid-bob', undefined);
});

it('links the owner to settings instead of rendering an inline editor', async () => {
  show('uid-alice');
  await ready();
  expect(
    screen.getByRole('link', { name: 'Edit profile' }).getAttribute('href'),
  ).toBe('/~/alice/settings');
  expect(screen.queryByLabelText('Username')).toBeNull();
});

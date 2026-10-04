import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { UserProfileSettings } from '../../src/web/UserProfileSettings';
const profile = {
  id: 'uid',
  username: 'alice',
  displayName: 'Alice',
  photoURL: null,
  createdAt: null,
};
const services = { get: jest.fn(), update: jest.fn() };
const navigate = jest.fn();
beforeEach(() => {
  jest.resetAllMocks();
  services.get.mockResolvedValue(profile);
  services.update.mockImplementation(async (changes) => ({
    ...profile,
    ...changes,
  }));
});
function show(props = {}) {
  return render(
    <UserProfileSettings
      username="alice"
      services={services}
      authenticated
      onNavigate={navigate}
      {...props}
    />,
  );
}
async function ready() {
  await screen.findByLabelText('Name');
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function save() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}
it('requires authentication and waits for the session', () => {
  const view = show({ authenticated: false, sessionLoading: true });
  expect(services.get).not.toHaveBeenCalled();
  view.rerender(
    <UserProfileSettings
      username="alice"
      services={services}
      authenticated={false}
      onNavigate={navigate}
    />,
  );
  expect(
    screen.getByRole('link', { name: 'Sign in' }).getAttribute('href'),
  ).toBe('/login');
  expect(services.get).not.toHaveBeenCalled();
});
it('loads the private identity and redirects an incorrect URL before displaying the form', async () => {
  show({ username: 'someone-else' });
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('alice', false));
  expect(screen.queryByLabelText('Name')).toBeNull();
});
it('saves only the trimmed name and stays in settings', async () => {
  show();
  await ready();
  change('Name', '  María Pérez  ');
  save();
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('alice', true));
  expect(services.update).toHaveBeenCalledWith({ displayName: 'María Pérez' });
});
it('normalizes username, sends both changed fields and follows the server identity', async () => {
  services.update.mockResolvedValue({ ...profile, username: 'canonical' });
  show();
  await ready();
  change('Username', ' New_Name ');
  change('Name', 'Bob');
  save();
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('canonical', true));
  expect(services.update).toHaveBeenCalledWith({
    username: 'new_name',
    displayName: 'Bob',
  });
});
it('keeps the exact Firebase UID when changing only the name', async () => {
  const username = 'FirebaseUID'.repeat(5);
  services.get.mockResolvedValue({ ...profile, username });
  show({ username });
  await ready();
  change('Name', 'Bob');
  save();
  await waitFor(() =>
    expect(services.update).toHaveBeenCalledWith({ displayName: 'Bob' }),
  );
});
it.each([
  ['Username', 'bad.name'],
  ['Name', '   '],
])('validates %s before making a request', async (label, value) => {
  show();
  await ready();
  change(label, value);
  save();
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(services.update).not.toHaveBeenCalled();
});
it('preserves input after a conflict and allows retry', async () => {
  services.update.mockRejectedValueOnce({ status: 409 });
  show();
  await ready();
  change('Username', 'taken');
  change('Name', 'Bob');
  save();
  await screen.findByText('Username is already taken.');
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Bob');
  change('Username', 'available');
  save();
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('available', true));
});
it('retries loading and shows the saved confirmation', async () => {
  services.get.mockRejectedValueOnce(new Error('offline'));
  show({ saved: true });
  await screen.findByRole('button', { name: 'Retry' });
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await ready();
  expect(screen.getByText('Profile saved.')).toBeTruthy();
});
it('blocks duplicate submissions while saving', async () => {
  let finish!: (value: typeof profile) => void;
  services.update.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  show();
  await ready();
  change('Name', 'Bob');
  save();
  const form = screen.getByLabelText('Name').closest('form');
  if (!form) throw new Error('Settings form is missing');
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(services.update).toHaveBeenCalledTimes(1);
  await act(async () => finish({ ...profile, displayName: 'Bob' }));
});

it('does not submit cosmetic changes or unchanged settings', async () => {
  show();
  await ready();
  change('Username', ' ALICE ');
  change('Name', ' Alice ');
  expect(
    (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(services.update).not.toHaveBeenCalled();
});

it('ignores a pending save after the session changes', async () => {
  let finish!: (value: typeof profile) => void;
  services.update.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = show();
  await ready();
  change('Name', 'Bob');
  save();
  view.rerender(
    <UserProfileSettings
      username="alice"
      services={services}
      authenticated={false}
      onNavigate={navigate}
    />,
  );
  await act(async () => finish({ ...profile, displayName: 'Bob' }));
  expect(navigate).not.toHaveBeenCalled();
});

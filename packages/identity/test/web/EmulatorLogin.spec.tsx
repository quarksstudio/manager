import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  IdentityProvider,
  type IdentityServices,
} from '../../src/presentation';
import { UserAvatarMenu } from '../../src/web/UserButton';

it('authenticates from the menu, displays failures, and retries to show the avatar', async () => {
  const loginWithLocalEmulator = jest
    .fn()
    .mockRejectedValueOnce(new Error('Local login failed'));
  const services: IdentityServices = {
    loginWithLocalEmulator,
    loginWithProvider: jest.fn(),
    submitManualLoginCode: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
    clearSession: jest.fn(),
  };
  const { container } = render(
    <IdentityProvider services={services}>
      <UserAvatarMenu environment="local" />
    </IdentityProvider>,
  );
  fireEvent.click(screen.getByText('Login'));
  fireEvent.click(await screen.findByText('Ingresar con emulador'));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Local login failed',
  );
  expect(loginWithLocalEmulator).toHaveBeenCalledTimes(1);
  let complete!: (session: unknown) => void;
  loginWithLocalEmulator.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  fireEvent.click(screen.getByText('Login'));
  fireEvent.click(await screen.findByText('Ingresar con emulador'));
  await waitFor(() => expect(loginWithLocalEmulator).toHaveBeenCalledTimes(2));
  await act(async () =>
    complete({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        uid: 'developer',
        email: 'developer@quark.local',
        displayName: 'developer',
        photoURL: 'https://image.test/avatar.png',
      },
    }),
  );
  await waitFor(() =>
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://image.test/avatar.png',
    ),
  );
  expect(screen.queryByRole('alert')).toBeNull();
  expect(services.loginWithProvider).not.toHaveBeenCalled();
});

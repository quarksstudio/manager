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
import { getBrowserNotificationRuntime } from '@quarks.studio/notifications/infrastructure';
import { NotificationHost } from '@quarks.studio/notifications/web';
import { UserAvatarMenu } from '../../src/web/containers/UserAvatarMenu';
import { saveSession, clearSession, resetStore } from '@quarks.studio/config';
import { createGlobalContext } from '@quarks.studio/config/http';

beforeEach(async () => {
  localStorage.clear();
  resetStore();
  await clearSession();
  const runtime = getBrowserNotificationRuntime();
  for (const item of runtime?.getSnapshot() ?? []) runtime?.dismiss(item.id);
});

it('restores the stored avatar after remount and returns to login after a 401', async () => {
  await saveSession({
    accessToken: 'stored-token',
    user: {
      uid: 'user',
      email: null,
      displayName: null,
      photoURL: 'https://image.test/stored.png',
    },
  });
  const services: IdentityServices = {
    loginWithProvider: jest.fn(),
    loginWithLocalEmulator: jest.fn(),
    submitManualLoginCode: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
    clearSession: jest.fn(clearSession),
  };
  const menu = (
    <IdentityProvider services={services}>
      <UserAvatarMenu />
    </IdentityProvider>
  );
  const first = render(menu);
  expect(screen.getByRole('status').getAttribute('aria-label')).toBe(
    'Cargando sesión',
  );
  await waitFor(() =>
    expect(first.container.querySelector('img')?.getAttribute('src')).toBe(
      'https://image.test/stored.png',
    ),
  );
  first.unmount();
  const second = render(menu);
  await waitFor(() =>
    expect(second.container.querySelector('img')?.getAttribute('src')).toBe(
      'https://image.test/stored.png',
    ),
  );
  expect(services.loginWithProvider).not.toHaveBeenCalled();
  fireEvent.click(second.container.querySelector('img') as HTMLImageElement);
  expect(await screen.findByText('Cerrar Sesión')).toBeTruthy();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue({ status: 401, ok: false, statusText: 'Unauthorized' });
  try {
    await act(async () => {
      const context = await createGlobalContext({
        baseUrl: 'http://registry.test/v1',
      });
      await expect(context.request('auth/me')).rejects.toThrow();
    });
    expect(await screen.findByText('Login')).toBeTruthy();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

it('shows a generic avatar for a token-only session and refreshes expiry on focus', async () => {
  await saveSession({ accessToken: 'token-only' });
  const services: IdentityServices = {
    loginWithProvider: jest.fn(),
    loginWithLocalEmulator: jest.fn(),
    submitManualLoginCode: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
    clearSession: jest.fn(clearSession),
  };
  const { container } = render(
    <IdentityProvider services={services}>
      <UserAvatarMenu />
    </IdentityProvider>,
  );
  await waitFor(() =>
    expect(container.querySelector('.ant-avatar')).toBeTruthy(),
  );
  expect(container.querySelector('img')).toBeNull();
  expect(screen.queryByText('Login')).toBeNull();
  await act(async () => {
    await saveSession({ accessToken: 'expires' }, 1);
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  expect(await screen.findByText('Login')).toBeTruthy();
});

it('authenticates from the menu, displays failures, and retries to show the avatar', async () => {
  const loginWithLocalEmulator = jest
    .fn()
    .mockRejectedValueOnce(new Error('Local login failed'));
  const services: IdentityServices = {
    loginWithLocalEmulator,
    loginWithProvider: jest.fn(),
    submitManualLoginCode: jest.fn(),
    me: jest.fn(),
    logout: jest
      .fn()
      .mockRejectedValueOnce(new Error('No se pudo terminar la sesión')),
    clearSession: jest.fn(clearSession),
  };
  const { container } = render(
    <IdentityProvider services={services}>
      <NotificationHost />
      <UserAvatarMenu environment="local" />
    </IdentityProvider>,
  );
  fireEvent.click(await screen.findByText('Login'));
  fireEvent.click(await screen.findByText('Ingresar con emulador'));
  expect(await screen.findByText('Local login failed')).toBeTruthy();
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
  await act(async () => {
    const session = {
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        uid: 'developer',
        email: 'developer@quark.local',
        displayName: 'developer',
        photoURL: 'https://image.test/avatar.png',
      },
    };
    await saveSession(session);
    complete(session);
  });
  await waitFor(() =>
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://image.test/avatar.png',
    ),
  );
  expect(await screen.findByText('Sesión iniciada')).toBeTruthy();
  expect(services.loginWithProvider).not.toHaveBeenCalled();
  fireEvent.click(container.querySelector('img') as HTMLImageElement);
  fireEvent.click(await screen.findByText('Cerrar Sesión'));
  await waitFor(() => expect(services.logout).toHaveBeenCalledTimes(1));
  expect(await screen.findByText('No se pudo terminar la sesión')).toBeTruthy();
  expect(container.querySelector('img')?.getAttribute('src')).toBe(
    'https://image.test/avatar.png',
  );
  fireEvent.click(container.querySelector('img') as HTMLImageElement);
  fireEvent.click(await screen.findByText('Cerrar Sesión'));
  expect(await screen.findByText('Sesión cerrada')).toBeTruthy();
  expect(services.clearSession).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Login')).toBeTruthy();
});

it('notifies once for provider failure and successful retry', async () => {
  const loginWithProvider = jest
    .fn()
    .mockRejectedValueOnce(new Error('Proveedor sin conexión'))
    .mockImplementationOnce(async () => {
      const session = {
        user: {
          uid: 'user',
          email: null,
          displayName: null,
          photoURL: 'https://image.test/avatar.png',
        },
        accessToken: 'token',
      };
      await saveSession(session);
      return session;
    });
  const services: IdentityServices = {
    loginWithProvider,
    loginWithLocalEmulator: jest.fn(),
    submitManualLoginCode: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
    clearSession: jest.fn(),
  };
  render(
    <IdentityProvider services={services}>
      <NotificationHost />
      <UserAvatarMenu />
    </IdentityProvider>,
  );
  fireEvent.click(await screen.findByText('Login'));
  fireEvent.click(await screen.findByText('Continuar con Google'));
  expect(await screen.findByText('Proveedor sin conexión')).toBeTruthy();
  expect(screen.getAllByText('No se pudo iniciar sesión')).toHaveLength(1);
  fireEvent.click(screen.getByText('Login'));
  fireEvent.click(await screen.findByText('Continuar con Google'));
  expect(await screen.findByText('Sesión iniciada')).toBeTruthy();
  expect(screen.getAllByText('Sesión iniciada')).toHaveLength(1);
  expect(loginWithProvider).toHaveBeenCalledWith(
    { provider: 'google', strategy: 'deep-link' },
    expect.any(Function),
  );
});

import { act, renderHook, render, screen } from '@testing-library/react';
import { useLogInItems, useLogOutItems, UserAvatarMenu } from '../../src/web';

const mockLogin = jest.fn();
const mockLogout = jest.fn();
let mockAuthenticated = false;
jest.mock('../../src/hooks', () => ({
  useAuthLogin: () => ({
    login: mockLogin,
    isAuthenticated: mockAuthenticated,
    user: { photoURL: 'https://image.test/avatar.png' },
  }),
  useAuthLogout: () => ({ logout: mockLogout }),
  useIdentitySession: () => ({
    isAuthenticated: mockAuthenticated,
    session: { user: { photoURL: 'https://image.test/avatar.png' } },
    loading: false,
    reload: jest.fn(),
  }),
}));
beforeEach(() => {
  mockLogin.mockReset();
  mockLogout.mockReset();
  mockAuthenticated = false;
});

it('maps the provider choices, including X, to identity providers', () => {
  const select = jest.fn();
  const { result } = renderHook(() => useLogInItems(false, select));
  for (const [key, provider] of [
    ['google', 'google'],
    ['github', 'github'],
    ['twitter', 'twitter'],
    ['facebook', 'facebook'],
  ]) {
    const item = result.current?.find(
      (item) => item?.key === key,
    ) as unknown as {
      onClick: () => void;
    };
    act(() => item.onClick());
    expect(select).toHaveBeenLastCalledWith(provider);
  }
});
it('provides the payment link and invokes logout', () => {
  const logout = jest.fn();
  const { result } = renderHook(() =>
    useLogOutItems(logout, { uid: 'firebase-uid', username: 'me' }),
  );
  const billing = result.current?.find((item) => item?.key === 'billing') as {
    label: React.ReactNode;
  };
  render(<>{billing.label}</>);
  expect(screen.getByText('Mis pagos').getAttribute('href')).toBe(
    '/~/me/billing',
  );
  const item = result.current?.find(
    (item) => item?.key === 'logout',
  ) as unknown as {
    onClick: () => void;
  };
  act(() => item.onClick());
  expect(logout).toHaveBeenCalledTimes(1);
});
it('shows login or the authenticated avatar from identity hooks', () => {
  const { rerender } = render(<UserAvatarMenu />);
  expect(screen.getByText('Login')).toBeTruthy();
  mockAuthenticated = true;
  rerender(<UserAvatarMenu />);
  expect(screen.getByRole('img').getAttribute('src')).toBe(
    'https://image.test/avatar.png',
  );
});

it.each([undefined, 'production', 'development'])(
  'hides emulator login outside local (%s)',
  (environment) => {
    const { result } = renderHook(() =>
      useLogInItems(false, jest.fn(), environment),
    );
    expect(result.current?.some((item) => item?.key === 'emulator')).toBe(
      false,
    );
  },
);

it('uses the same callback for emulator and providers and blocks all items while loading', () => {
  const login = jest.fn();
  const { result, rerender } = renderHook(
    ({ isLoading }) => useLogInItems(isLoading, login, 'local'),
    { initialProps: { isLoading: false } },
  );
  const emulator = result.current?.find((item) => item?.key === 'emulator') as {
    onClick: () => void;
    label: string;
  };
  expect(emulator.label).toBe('Ingresar con emulador');
  act(() => emulator.onClick());
  expect(login).toHaveBeenLastCalledWith('emulator');
  rerender({ isLoading: true });
  for (const item of result.current ?? []) {
    const entry = item as {
      key: string;
      disabled: boolean;
      onClick?: () => void;
    };
    expect(entry.disabled).toBe(true);
    act(() => entry.onClick?.());
  }
  expect(login).toHaveBeenCalledTimes(1);
});

it('consumes asynchronous and synchronous callback failures', async () => {
  const login = jest
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockImplementationOnce(() => {
      throw new Error('offline');
    });
  const { result } = renderHook(() => useLogInItems(false, login));
  const item = result.current?.find((item) => item?.key === 'google') as {
    onClick: () => void;
  };
  await act(async () => {
    item.onClick();
    await Promise.resolve();
  });
  expect(() => item.onClick()).not.toThrow();
  expect(login).toHaveBeenCalledTimes(2);
});

it('does not build a profile link from a legacy UID before username resolution', () => {
  const { result } = renderHook(() =>
    useLogOutItems(jest.fn(), { uid: 'firebase-uid' }),
  );
  const profile = result.current?.find((item) => item?.key === 'profile') as {
    label: React.ReactNode;
  };
  render(<>{profile.label}</>);
  expect(screen.getByText('Mi Perfil').getAttribute('href')).toBeNull();
});

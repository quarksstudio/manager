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
}));
beforeEach(() => {
  mockLogin.mockReset();
  mockLogout.mockReset();
  mockAuthenticated = false;
});

it('maps the provider choices, including X, to identity providers', () => {
  const select = jest.fn();
  const { result } = renderHook(() => useLogInItems(select));
  for (const [key, provider] of [
    ['google', 'google'],
    ['github', 'github'],
    ['x', 'twitter'],
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
  const { result } = renderHook(() => useLogOutItems(logout));
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

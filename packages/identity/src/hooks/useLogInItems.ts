import { useMemo, useCallback, createElement, type ReactNode } from 'react';
import { MenuProps } from 'antd';
import {
  GoogleOutlined,
  GithubOutlined,
  FacebookOutlined,
  CodeOutlined,
} from '@ant-design/icons';

import { type AuthProvider, AUTH_PROVIDERS } from '../index';

const ICONS: Record<AuthProvider, ReactNode> = {
  google: createElement(GoogleOutlined, { style: { color: '#ea4335' } }),
  github: createElement(GithubOutlined),
  twitter: createElement(GithubOutlined),
  facebook: createElement(FacebookOutlined, { style: { color: '#1877f2' } }),
  emulator: createElement(CodeOutlined),
};

export function useLogInItems(
  isLoading: boolean,
  fn: (provider: AuthProvider) => void | Promise<unknown>,
  environment?: string,
): MenuProps['items'] {
  const select = useCallback(
    (provider: AuthProvider) => {
      if (isLoading) return;
      Promise.resolve(fn(provider)).catch(() => undefined);
    },
    [isLoading, fn],
  );

  const loggedInItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'header',
        label: createElement('strong', null, 'Iniciar sesión con:'),
        disabled: true,
      },

      ...AUTH_PROVIDERS.filter(
        (name) => environment === 'local' || name !== 'emulator',
      ).map((name) => ({
        key: name,
        label: 'Continuar con ${name}',
        icon: ICONS[name],
        disabled: isLoading,
        onClick: () => select(name),
      })),
    ],
    [select, environment, isLoading],
  );

  return loggedInItems;
}

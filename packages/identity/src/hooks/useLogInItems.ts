import type { AuthProvider } from '../index';
import { useMemo, createElement } from 'react';
import { MenuProps } from 'antd';
import {
  GoogleOutlined,
  GithubOutlined,
  FacebookOutlined,
} from '@ant-design/icons';

export function useLogInItems(fn: (provider: AuthProvider) => void) {
  const loggedInItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'header',
        label: createElement('strong', null, 'Iniciar sesión con:'),
        disabled: true,
      },
      {
        key: 'google',
        label: 'Continuar con Google',
        icon: createElement(GoogleOutlined, { style: { color: '#ea4335' } }),
        onClick: () => fn('google'),
      },
      {
        key: 'github',
        label: 'Continuar con GitHub',
        icon: createElement(GithubOutlined),
        onClick: () => fn('github'),
      },
      {
        key: 'x',
        label: 'Continuar con X',
        icon: createElement(GithubOutlined),
        onClick: () => fn('twitter'),
      },
      {
        key: 'facebook',
        label: 'Continuar con Facebook',
        icon: createElement(FacebookOutlined, { style: { color: '#1877f2' } }),
        onClick: () => fn('facebook'),
      },
    ],
    [fn],
  );

  return loggedInItems;
}

import type { AuthProvider } from '@quarks.studio/identity';
import { useMemo } from 'react';
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
        label: <strong>Iniciar sesión con:</strong>,
        disabled: true,
      },
      {
        key: 'google',
        label: 'Continuar con Google',
        icon: <GoogleOutlined style={{ color: '#ea4335' }} />,
        onClick: () => fn('google'),
      },
      {
        key: 'github',
        label: 'Continuar con GitHub',
        icon: <GithubOutlined />,
        onClick: () => fn('github'),
      },
      {
        key: 'x',
        label: 'Continuar con X',
        icon: <GithubOutlined />,
        onClick: () => fn('twitter'),
      },
      {
        key: 'facebook',
        label: 'Continuar con Facebook',
        icon: <FacebookOutlined style={{ color: '#1877f2' }} />,
        onClick: () => fn('facebook'),
      },
    ],
    [fn],
  );

  return loggedInItems;
}

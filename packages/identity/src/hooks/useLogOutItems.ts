import { useMemo, createElement } from 'react';
import { MenuProps } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';

export function useLogOutItems(
  fn: () => void,
  user?: Record<string, unknown> | undefined,
) {
  const username =
    typeof user?.['username'] === 'string' ? user['username'] : undefined;
  const base = username ? `/~/${encodeURIComponent(username)}` : undefined;
  const loggedInItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'profile',
        label: createElement('a', { href: base }, 'Mi Perfil'),
        icon: createElement(UserOutlined),
      },
      {
        key: 'settings',
        label: createElement(
          'a',
          { href: base ? `${base}/settings` : undefined },
          'Configuración',
        ),
        icon: createElement(SettingOutlined),
      },
      {
        key: 'billing',
        label: createElement(
          'a',
          { href: base ? `${base}/billing` : undefined },
          'Mis pagos',
        ),
        icon: createElement(CreditCardOutlined),
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        label: 'Cerrar Sesión',
        icon: createElement(LogoutOutlined),
        danger: true,
        onClick: () => fn(),
      },
    ],
    [fn, base],
  );

  return loggedInItems;
}

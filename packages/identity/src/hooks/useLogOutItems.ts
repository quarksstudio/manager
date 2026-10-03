import { useMemo, createElement } from 'react';
import { MenuProps } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';

export function useLogOutItems(fn: () => void) {
  const loggedInItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'profile',
        label: 'Mi Perfil',
        icon: createElement(UserOutlined),
        onClick: () => console.log('Ir a perfil'),
      },
      {
        key: 'settings',
        label: 'Configuración',
        icon: createElement(SettingOutlined),
        onClick: () => console.log('Ir a configuración'),
      },
      {
        key: 'billing',
        label: createElement('a', { href: '/~/me/billing' }, 'Mis pagos'),
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
    [fn],
  );

  return loggedInItems;
}

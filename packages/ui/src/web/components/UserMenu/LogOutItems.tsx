import { useMemo } from 'react';
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
        icon: <UserOutlined />,
        onClick: () => console.log('Ir a perfil'),
      },
      {
        key: 'settings',
        label: 'Configuración',
        icon: <SettingOutlined />,
        onClick: () => console.log('Ir a configuración'),
      },
      {
        key: 'billing',
        label: <a href="/~/me/billing">Mis pagos</a>,
        icon: <CreditCardOutlined />,
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        label: 'Cerrar Sesión',
        icon: <LogoutOutlined />,
        danger: true,
        onClick: () => fn(),
      },
    ],
    [fn],
  );

  return loggedInItems;
}

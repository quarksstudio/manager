import { Dropdown, Avatar, Space, Spin } from 'antd';
import { useNotifications } from '@quarks.studio/notifications/hooks';
import { UserOutlined } from '@ant-design/icons';
import { QuarkTheme } from '@quarks.studio/web-ui';

import { useAuthLogin, useAuthLogout, useIdentitySession } from '../../hooks';

import { useLogInItems } from '../../hooks/useLogInItems';
import { useLogOutItems } from '../../hooks/useLogOutItems';

export interface UserAvatarMenuProps {
  environment?: string;
}

export function UserAvatarMenu({ environment }: UserAvatarMenuProps = {}) {
  const { login, isLoading, reset } = useAuthLogin();
  const { session, isAuthenticated, loading, reload } = useIdentitySession();
  const user = session?.user;
  const busy = loading || isLoading;
  const { logout } = useAuthLogout();
  const { notify } = useNotifications();

  const loggedInItems = useLogInItems(
    busy,
    async (provider) => {
      try {
        await login(provider, { strategy: 'deep-link' });
        await reload();
      } catch (reason) {
        await notify({
          level: 'error',
          title: 'No se pudo iniciar sesión',
          message:
            reason instanceof Error ? reason.message : 'Inténtalo de nuevo.',
        });
        return;
      }
      await notify({ level: 'success', title: 'Sesión iniciada' });
    },
    environment,
  );
  const loggedOutItems = useLogOutItems(() => {
    void (async () => {
      try {
        await logout();
        await reload();
      } catch (reason) {
        await notify({
          level: 'error',
          title: 'No se pudo cerrar sesión',
          message:
            reason instanceof Error ? reason.message : 'Inténtalo de nuevo.',
        });
        return;
      }
      reset();
      await notify({ level: 'success', title: 'Sesión cerrada' });
    })().catch(() => undefined);
  }, user);

  return (
    <QuarkTheme>
      <Dropdown
        disabled={busy}
        menu={{ items: isAuthenticated ? loggedOutItems : loggedInItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        {busy ? (
          <span role="status" aria-label="Cargando sesión">
            <Spin size="small" />
          </span>
        ) : isAuthenticated ? (
          <Space style={{ cursor: 'pointer' }}>
            <Avatar
              size="large"
              icon={<UserOutlined />}
              src={user?.photoURL ?? undefined}
              style={{
                backgroundColor: '#ccc',
              }}
            />
          </Space>
        ) : (
          <span>Login</span>
        )}
      </Dropdown>
    </QuarkTheme>
  );
}

import { Dropdown, Avatar, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';

import { useAuthLogin, useAuthLogout } from '../hooks';
import { type AuthProvider } from '../index';

import { useLogInItems } from '../hooks/useLogInItems';
import { useLogOutItems } from '../hooks/useLogOutItems';

export function UserAvatarMenu() {
  const { login, isAuthenticated, user } = useAuthLogin();
  const { logout } = useAuthLogout();

  const loggedInItems = useLogInItems((provider: AuthProvider) =>
    login({ provider, strategy: 'deep-link' }),
  );
  const loggedOutItems = useLogOutItems(() => logout());

  return (
    <Dropdown
      menu={{ items: isAuthenticated ? loggedOutItems : loggedInItems }}
      trigger={['click']}
      placement="bottomLeft"
    >
      {isAuthenticated ? (
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
  );
}

import { Dropdown, Avatar, Space, Alert } from 'antd';
import { UserOutlined } from '@ant-design/icons';

import { useAuthLogin, useAuthLogout } from '../hooks';

import { useLogInItems } from '../hooks/useLogInItems';
import { useLogOutItems } from '../hooks/useLogOutItems';

export interface UserAvatarMenuProps {
  environment?: string;
}

export function UserAvatarMenu({ environment }: UserAvatarMenuProps = {}) {
  const { login, isAuthenticated, user, isLoading, error } = useAuthLogin();
  const { logout } = useAuthLogout();

  const loggedInItems = useLogInItems(
    isLoading,
    (provider) => login(provider, { strategy: 'deep-link' }),
    environment,
  );
  const loggedOutItems = useLogOutItems(() => logout());

  return (
    <>
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
      {error && <Alert type="error" showIcon title={error.message} />}
    </>
  );
}

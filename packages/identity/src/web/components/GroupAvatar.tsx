import { Avatar, Spin, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAvatar } from '../../hooks/useAvatar';

export function GroupAvatar({
  people = [],
  maxCount = 50,
}: {
  people?: string[];
  maxCount?: number;
}) {
  const { data, loading } = useAvatar(people);

  return (
    <Spin spinning={loading} size="small">
      <Avatar.Group
        max={{
          style: { backgroundColor: '#52c41a', color: '#fff' },
          count: Math.max(1, maxCount - 1),
        }}
      >
        {data.map(({ username, photo, displayName }) => (
          <Tooltip key={username} title={displayName} placement="top">
            <a href={`/~/${encodeURIComponent(username)}`}>
              <Avatar
                src={photo}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: '#ccc',
                }}
              />
            </a>
          </Tooltip>
        ))}
      </Avatar.Group>
    </Spin>
  );
}

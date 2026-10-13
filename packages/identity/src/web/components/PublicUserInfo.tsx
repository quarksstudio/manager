import { formatDate } from '@quarks.studio/web-ui';
import type { PublicUserProfile } from '../../domain/public-user-profile';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

export function PublicUserInfo({ profile }: { profile: PublicUserProfile }) {
  const joinDate = profile.createdAt;
  const validDate = joinDate !== null && !Number.isNaN(Date.parse(joinDate));
  return (
    <section className="flex min-w-0 items-start gap-4">
      <div className="inline-block h-14 w-14 shrink-0 overflow-hidden rounded-full ant-avatar ant-avatar-circle ant-avatar-image">
        <Avatar
          size={64}
          icon={<UserOutlined />}
          src={profile.photoURL ?? undefined}
          style={{
            backgroundColor: '#ccc',
          }}
        />
      </div>
      <a href={`/~/${encodeURIComponent(profile.username)}`}>
        <h1 className="break-all font-mono text-xl font-semibold">
          {profile.username}
        </h1>
        <p className="mt-0 text-sm text-slate-400">
          {validDate ? (
            <>
              Joined <time dateTime={joinDate}>{formatDate(joinDate)}</time>
            </>
          ) : (
            'Join date unavailable'
          )}
        </p>
      </a>
    </section>
  );
}

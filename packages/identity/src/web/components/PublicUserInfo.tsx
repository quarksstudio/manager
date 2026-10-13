import { formatDate, UserAvatar } from '@quarks.studio/web-ui';
import type { PublicUserProfile } from '../../domain/public-user-profile';

export function PublicUserInfo({ profile }: { profile: PublicUserProfile }) {
  const joinDate = profile.createdAt;
  const validDate = joinDate !== null && !Number.isNaN(Date.parse(joinDate));
  return (
    <section className="flex min-w-0 items-start gap-4">
      <UserAvatar
        username={profile.username}
        size={64}
        src={profile.photoURL}
        style={{ backgroundColor: '#ccc' }}
      />
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

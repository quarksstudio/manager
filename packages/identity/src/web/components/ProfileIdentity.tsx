import { Avatar, Tag } from 'antd';
import type { AccountProfile } from '../../application/account-dashboard.port';
import { MonoValue } from './MonoValue';

/** Identity header (avatar + name + provider) shared by the dashboard tabs. */
export function ProfileIdentity({ profile }: { profile: AccountProfile }) {
  const initial =
    Array.from(profile.displayName || profile.username)[0]?.toUpperCase() ??
    '?';
  return (
    <div className="flex min-w-0 items-center gap-4">
      <Avatar
        size={56}
        aria-label={`Avatar of ${profile.username}`}
        className="shrink-0 bg-slate-800 text-xl"
      >
        {initial}
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold">{profile.displayName}</p>
        <p className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-400">
          <MonoValue value={`@${profile.username}`} />
          {profile.provider && <Tag>{profile.provider}</Tag>}
        </p>
      </div>
    </div>
  );
}

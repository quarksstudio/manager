import { useState } from 'react';
import { formatDate } from '@quarks.studio/web-ui';
import type { PublicUserProfile } from '../domain/public-user-profile';

export function PublicUserInfo({ profile }: { profile: PublicUserProfile }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const joinDate = profile.createdAt;
  const validDate = joinDate !== null && !Number.isNaN(Date.parse(joinDate));
  return (
    <aside className="flex min-w-0 items-start gap-4 lg:flex-col lg:gap-0">
      {profile.photoURL && failedImage !== profile.photoURL ? (
        <img
          src={profile.photoURL}
          alt={`Avatar of ${profile.username}`}
          width={96}
          height={96}
          onError={() => setFailedImage(profile.photoURL)}
          className="h-24 w-24 shrink-0 lg:mb-5 rounded-lg border border-slate-800 object-cover"
        />
      ) : (
        <div
          aria-label={`Avatar of ${profile.username}`}
          className="flex h-24 w-24 shrink-0 lg:mb-5 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-4xl font-semibold"
        >
          {Array.from(profile.username)[0]?.toUpperCase() || '?'}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="break-all font-mono text-xl font-semibold">
          {profile.username}
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          {validDate ? (
            <>
              Joined <time dateTime={joinDate}>{formatDate(joinDate)}</time>
            </>
          ) : (
            'Join date unavailable'
          )}
        </p>
      </div>
    </aside>
  );
}

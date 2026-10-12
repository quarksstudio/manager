import { useState } from 'react';
import { formatDate } from '@quarks.studio/web-ui';
import type { PublicUserProfile } from '../../domain/public-user-profile';

export function PublicUserInfo({ profile }: { profile: PublicUserProfile }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const joinDate = profile.createdAt;
  const validDate = joinDate !== null && !Number.isNaN(Date.parse(joinDate));
  return (
    <section className="flex min-w-0 items-start gap-4 lg:flex-row lg:gap-0">
      <div className="inline-block h-14 w-14 shrink-0 overflow-hidden rounded-full ant-avatar ant-avatar-circle ant-avatar-image">
        {profile.photoURL && failedImage !== profile.photoURL ? (
          <img
            src={profile.photoURL}
            alt={`Avatar of ${profile.username}`}
            onError={() => setFailedImage(profile.photoURL)}
            width={62}
            height={62}
          />
        ) : (
          <div
            width={62}
            height={62}
            aria-label={`Avatar of ${profile.username}`}
            className="flex h-24 w-24 shrink-0 lg:mb-5 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-4xl font-semibold"
          >
            {Array.from(profile.username)[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>
      <div className="min-w-0">
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
      </div>
    </section>
  );
}

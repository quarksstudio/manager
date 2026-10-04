import { QuarkTheme } from '@quarks.studio/web-ui';
import { PublicUserInfo } from './PublicUserInfo';
import { UserPackageGrid } from '@quarks.studio/package-search/web';
import { useUserProfile } from '../hooks/useUserProfile';
import { useUserProfileServices } from '../hooks/useUserProfileServices';
import { useIdentitySession } from '../hooks/useIdentitySession';
import type { UserProfileServices } from '../application/user-profile.port';

export function ConfiguredUserProfile({
  username,
  apiBaseUrl,
}: {
  username: string;
  apiBaseUrl?: string;
}) {
  const services = useUserProfileServices(apiBaseUrl);
  const { session } = useIdentitySession();
  return (
    <QuarkTheme>
      <UserProfile
        key={username}
        username={username}
        services={services}
        currentUserId={session?.user?.id ?? session?.user?.uid}
        packageUrl={(name) => `/packages/${encodeURIComponent(name)}`}
      />
    </QuarkTheme>
  );
}

export interface UserProfileProps {
  username: string;
  services: UserProfileServices;
  currentUserId?: string;
  packageUrl: (name: string) => string;
}

export function UserProfile({
  username,
  services,
  currentUserId,
  packageUrl,
}: UserProfileProps) {
  const { profile, page, error, loading, load, sentinel } = useUserProfile(
    username,
    services,
  );
  if (!profile) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-12" aria-busy={loading}>
        <p role="status">
          {loading
            ? 'Loading profile…'
            : error === 'not-found'
              ? 'User not found.'
              : 'Could not load profile.'}
        </p>
        {!loading && error === 'profile' && (
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 underline"
          >
            Retry
          </button>
        )}
      </main>
    );
  }
  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="min-w-0">
        <PublicUserInfo profile={profile} />
        {currentUserId === profile.id && (
          <a
            className="mt-4 inline-block text-sm underline"
            href={`/~/${encodeURIComponent(profile.username)}/settings`}
          >
            Edit profile
          </a>
        )}
      </div>
      <section
        className="min-w-0"
        aria-label="User packages"
        aria-busy={loading}
      >
        <h2 className="mb-6 text-xl font-semibold">
          {page
            ? `${page.totalCount} ${page.totalCount === 1 ? 'Package' : 'Packages'}`
            : 'Packages'}
        </h2>
        {page && <UserPackageGrid items={page.items} packageUrl={packageUrl} />}
        {page?.totalCount === 0 && (
          <p className="text-sm text-slate-400">No packages to show.</p>
        )}
        <div ref={sentinel} className="mt-6" role="status" aria-live="polite">
          {loading && (
            <p className="text-sm text-slate-400">Loading packages…</p>
          )}
          {error === 'packages' && (
            <p className="text-sm text-slate-400">Could not load packages.</p>
          )}
        </div>
        {!loading && (error === 'packages' || page?.nextCursor) && (
          <button
            type="button"
            className="mt-3 rounded border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900 focus-visible:outline-2"
            onClick={() => void load()}
          >
            {error ? 'Retry' : 'Load more'}
          </button>
        )}
      </section>
    </main>
  );
}

import { Spin } from 'antd';
import { PublicUserInfo } from '../components/PublicUserInfo';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { UserProfileServices } from '../../application/user-profile.port';

const links = [
  { key: 'profile', label: 'Profile', suffix: '' },
  { key: 'settings', label: 'Settings', suffix: '/settings' },
  { key: 'billing', label: 'Purchases', suffix: '/billing' },
  { key: 'tokens', label: 'Tokens / Auth', suffix: '/token' },
  { key: 'integrations', label: 'AI Integrations', suffix: '/integrations' },
] as const;

export type AccountPage = (typeof links)[number]['key'];
export type SettingsTab = AccountPage;

/** The shared route navigation for an account's profile pages. */
export function SettingsSidebar({
  active,
  username,
  services,
}: {
  active: AccountPage;
  username: string;
  services: UserProfileServices;
}) {
  const { profile, error, loading, load } = useUserProfile(username, services);

  return (
    <aside className="account-navigation min-w-0 space-y-6">
      {profile && <PublicUserInfo profile={profile} />}
      {!profile && loading && (
        <div
          className="flex min-h-24 items-center gap-3 text-sm text-slate-400"
          role="status"
          aria-label="Loading profile"
        >
          <Spin size="small" />
          <span>Loading profile…</span>
        </div>
      )}
      {!profile && error && (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-slate-400">
            {error === 'not-found'
              ? 'User not found.'
              : 'Could not load profile.'}
          </p>
          {error !== 'not-found' && (
            <button
              type="button"
              onClick={() => void load()}
              className="text-sm underline"
            >
              Retry
            </button>
          )}
        </div>
      )}
      {profile && (
        <nav aria-label="Profile navigation" className="min-w-0 w-full">
          <ul className="space-y-1 rounded-lg border border-slate-800 p-2">
            {links.map(({ key, label, suffix }) => (
              <li key={key}>
                <a
                  href={`/~/${encodeURIComponent(username)}${suffix}`}
                  aria-current={active === key ? 'page' : undefined}
                  className={`block rounded-md px-3 py-2 text-sm hover:bg-slate-800 ${active === key ? 'bg-slate-800 font-medium text-white' : 'text-slate-300'}`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
}

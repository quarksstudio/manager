import { Spin, Menu } from 'antd';
import { useNotifications } from '@quarks.studio/notifications/hooks';
import { PublicUserInfo } from '../components/PublicUserInfo';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { UserProfileServices } from '../../application/user-profile.port';
import { useLogOutItems } from '../../hooks/useLogOutItems';
import { useAuthLogin, useAuthLogout, useIdentitySession } from '../../hooks';

export type AccountPage =
  'profile' | 'settings' | 'billing' | 'tokens' | 'integrations';
export type SettingsTab = AccountPage;

/** The shared route navigation for an account's profile pages. */
export function SettingsSidebar({
  active,
  username,
  services,
  showMenu,
}: {
  active: AccountPage;
  username: string;
  showMenu: boolean;
  services: UserProfileServices;
}) {
  const { profile, error, loading, load } = useUserProfile(username, services);
  const { reset } = useAuthLogin();
  const { reload } = useIdentitySession();
  const { logout } = useAuthLogout();
  const { notify } = useNotifications();

  const links = useLogOutItems(() => {
    void (async () => {
      try {
        await logout();
        await reload();
      } catch (reason) {
        await notify({
          level: 'error',
          title: 'No se pudo cerrar sesión',
          message:
            reason instanceof Error ? reason.message : 'Inténtalo de nuevo.',
        });
        return;
      }
      reset();
      await notify({ level: 'success', title: 'Sesión cerrada' });
    })().catch(() => undefined);
  }, profile ?? { username });

  return (
    <>
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
      {!profile && showMenu && error && (
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
      {showMenu && (
        <nav aria-label="Profile navigation" className="min-w-0 w-full py-12">
          <Menu
            selectedKeys={[active]}
            items={links}
            style={{
              background: 'transparent',
              borderRight: 0,
            }}
          />
        </nav>
      )}
    </>
  );
}

import { QuarkTheme } from '@quarks.studio/web-ui';
import { useIdentitySession } from '../../hooks/useIdentitySession';
import {
  SettingsSidebar,
  type AccountPage,
} from '../components/SettingsSidebar';
import { useUserProfileServices } from '../../hooks/useUserProfileServices';

export function ConfiguredAccountNavigation({
  username,
  profileId,
  active,
  apiBaseUrl,
}: {
  username: string;
  profileId: string;
  active: AccountPage;
  apiBaseUrl: string;
}) {
  const { session, loading } = useIdentitySession();
  const user = session?.user as { id?: string; uid?: string } | undefined;
  const services = useUserProfileServices(apiBaseUrl);

  if (loading || (user?.id ?? user?.uid) !== profileId) return null;

  return (
    <QuarkTheme>
      <SettingsSidebar
        username={username}
        active={active}
        services={services}
      />
    </QuarkTheme>
  );
}

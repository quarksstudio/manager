import { QuarkTheme } from '@quarks.studio/web-ui';
import { useIdentitySession } from '../../hooks/useIdentitySession';
import {
  SettingsSidebar,
  type AccountPage,
} from '../components/SettingsSidebar';
import { useUserProfileServices } from '../../hooks/useUserProfileServices';
import { IdentityProvider } from '../../presentation';
import { useIdentityServices } from '../../hooks/useIdentityServices';

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
  const servicesId = useIdentityServices();
  const user = session?.user as { id?: string; uid?: string } | undefined;
  const services = useUserProfileServices(apiBaseUrl);
  return (
    <QuarkTheme>
      <IdentityProvider services={servicesId}>
        <SettingsSidebar
          username={username}
          active={active}
          services={services}
          showMenu={!(loading || (user?.id ?? user?.uid) !== profileId)}
        />
      </IdentityProvider>
    </QuarkTheme>
  );
}

import { QuarkTheme } from '@quarks.studio/web-ui';
import { useUserProfileServices } from '../../hooks/useUserProfileServices';
import { UserProfile } from '../containers/UserProfile';

export function ConfiguredUserProfile({
  username,
  apiBaseUrl,
}: {
  username: string;
  apiBaseUrl?: string;
}) {
  const services = useUserProfileServices(apiBaseUrl);
  return (
    <QuarkTheme>
      <UserProfile
        key={username}
        username={username}
        services={services}
        packageUrl={(name) => `/${encodeURIComponent(name)}`}
      />
    </QuarkTheme>
  );
}

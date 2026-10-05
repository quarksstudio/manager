import { QuarkTheme } from '@quarks.studio/web-ui';
import { useUserProfileServices } from '../../hooks/useUserProfileServices';
import { useIdentitySession } from '../../hooks/useIdentitySession';
import { UserProfile } from '../containers/UserProfile';

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

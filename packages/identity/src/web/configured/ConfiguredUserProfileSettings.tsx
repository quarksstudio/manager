import { useMemo } from 'react';
import { QuarkTheme } from '@quarks.studio/web-ui';
import { useIdentitySession } from '../../hooks/useIdentitySession';
import { userSettingsServices } from '../../infrastructure/user-settings-services';
import { UserProfileSettings } from '../containers/UserProfileSettings';

export function ConfiguredUserProfileSettings({
  username,
  apiBaseUrl,
}: {
  username: string;
  apiBaseUrl?: string;
}) {
  const session = useIdentitySession();
  const services = useMemo(
    () => userSettingsServices(apiBaseUrl),
    [apiBaseUrl],
  );
  return (
    <QuarkTheme>
      <UserProfileSettings
        username={username}
        services={services}
        sessionLoading={session.loading}
        authenticated={session.isAuthenticated}
        sessionError={session.error?.message}
        onRetrySession={session.reload}
        saved={new URLSearchParams(window.location.search).get('saved') === '1'}
        onNavigate={(name, saved) =>
          window.location.assign(
            `/~/${encodeURIComponent(name)}/settings${saved ? '?saved=1' : ''}`,
          )
        }
      />
    </QuarkTheme>
  );
}

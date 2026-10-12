import { useMemo } from 'react';
import { QuarkTheme } from '@quarks.studio/web-ui';
import { useIdentitySession } from '../../hooks/useIdentitySession';
import { createAccountDashboardServices } from '../../infrastructure/account-dashboard-services';
import { TokensAPISettingsDashboard } from '../containers/TokensAPISettingsDashboard';

export function ConfiguredTokensAPISettingsDashboard({
  username,
  apiBaseUrl,
}: {
  username: string;
  apiBaseUrl?: string;
}) {
  const session = useIdentitySession();
  const services = useMemo(
    () => createAccountDashboardServices(apiBaseUrl),
    [apiBaseUrl],
  );

  return (
    <QuarkTheme>
      <h1 className="mb-6 text-2xl font-semibold">Tokens / Auth</h1>
      <TokensAPISettingsDashboard
        username={username}
        services={services}
        sessionLoading={session.loading}
        authenticated={session.isAuthenticated}
        sessionError={session.error?.message}
        onRetrySession={session.reload}
        onNavigate={(name) =>
          window.location.assign(`/~/${encodeURIComponent(name)}/token`)
        }
      />
    </QuarkTheme>
  );
}

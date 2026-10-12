import { useMemo } from 'react';
import { QuarkTheme } from '@quarks.studio/web-ui';
import { useIdentitySession } from '../../hooks/useIdentitySession';
import { createAccountDashboardServices } from '../../infrastructure/account-dashboard-services';
import { IntegrationsSettingsDashboard } from '../containers/IntegrationsSettingsDashboard';

export function ConfiguredIntegrationsSettingsDashboard({
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
      <h1 className="mb-6 text-2xl font-semibold">AI Integrations</h1>
      <IntegrationsSettingsDashboard
        username={username}
        services={services}
        sessionLoading={session.loading}
        authenticated={session.isAuthenticated}
        sessionError={session.error?.message}
        onRetrySession={session.reload}
        onNavigate={(name) =>
          window.location.assign(`/~/${encodeURIComponent(name)}/integrations`)
        }
      />
    </QuarkTheme>
  );
}

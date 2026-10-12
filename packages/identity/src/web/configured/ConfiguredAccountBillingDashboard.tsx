import { useMemo } from 'react';
import { QuarkTheme } from '@quarks.studio/web-ui';
import { useIdentitySession } from '../../hooks/useIdentitySession';
import { createAccountDashboardServices } from '../../infrastructure/account-dashboard-services';
import { AccountBillingDashboard } from '../containers/AccountBillingDashboard';

export function ConfiguredAccountBillingDashboard({
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
      <AccountBillingDashboard
        username={username}
        services={services}
        sessionLoading={session.loading}
        authenticated={session.isAuthenticated}
        sessionError={session.error?.message}
        onRetrySession={session.reload}
        onNavigate={(name) =>
          window.location.assign(`/~/${encodeURIComponent(name)}/billing`)
        }
      />
    </QuarkTheme>
  );
}

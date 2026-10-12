import { useState } from 'react';
import { useAccountDashboard } from '../../hooks/useAccountDashboard';
import type { AccountDashboardServices } from '../../application/account-dashboard.port';
import { IntegrationsTab } from '../components/IntegrationsTab';
import {
  AccountSettingsAccessGate,
  type AccountSettingsAccessProps,
} from './AccountSettingsAccessGate';

export type IntegrationsSettingsDashboardProps = AccountSettingsAccessProps & {
  services: AccountDashboardServices;
};

export function IntegrationsSettingsDashboard({
  username,
  services,
  sessionLoading = false,
  authenticated,
  sessionError,
  onRetrySession,
  onNavigate,
}: IntegrationsSettingsDashboardProps) {
  const enabled = authenticated && !sessionLoading && !sessionError;
  const dashboard = useAccountDashboard(
    services,
    Boolean(enabled),
    'integrations',
  );
  const [integrationsSaved, setIntegrationsSaved] = useState(false);

  return (
    <AccountSettingsAccessGate
      username={username}
      sessionLoading={sessionLoading}
      authenticated={authenticated}
      sessionError={sessionError}
      onRetrySession={onRetrySession}
      onNavigate={onNavigate}
      profile={dashboard.profile}
      profileLoading={dashboard.profileLoading}
      profileError={dashboard.profileError}
      onRetryProfile={dashboard.reloadProfile}
    >
      {dashboard.integrations ? (
        <IntegrationsTab
          settings={dashboard.integrations}
          loading={dashboard.integrationsLoading}
          saving={dashboard.integrationsSaving}
          error={dashboard.integrationsError}
          saved={integrationsSaved}
          preview={services.preview}
          onSave={async (settings) => {
            const saved = await dashboard.saveIntegrations(settings);
            if (saved) setIntegrationsSaved(true);
            return saved;
          }}
          onRetry={() => void dashboard.reloadIntegrations()}
        />
      ) : (
        <>
          <p role={dashboard.integrationsError ? 'alert' : 'status'}>
            {dashboard.integrationsLoading
              ? 'Loading integrations…'
              : dashboard.integrationsError}
          </p>
          {!dashboard.integrationsLoading && dashboard.integrationsError && (
            <button
              type="button"
              className="mt-3 underline"
              onClick={() => void dashboard.reloadIntegrations()}
            >
              Retry
            </button>
          )}
        </>
      )}
    </AccountSettingsAccessGate>
  );
}

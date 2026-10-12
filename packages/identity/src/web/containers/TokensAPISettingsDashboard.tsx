import { useAccountDashboard } from '../../hooks/useAccountDashboard';
import type { AccountDashboardServices } from '../../application/account-dashboard.port';
import { TokensTab } from '../components/TokensTab';
import {
  AccountSettingsAccessGate,
  type AccountSettingsAccessProps,
} from './AccountSettingsAccessGate';

export type TokensAPISettingsDashboardProps = AccountSettingsAccessProps & {
  services: AccountDashboardServices;
};

export function TokensAPISettingsDashboard({
  username,
  services,
  sessionLoading = false,
  authenticated,
  sessionError,
  onRetrySession,
  onNavigate,
}: TokensAPISettingsDashboardProps) {
  const enabled = authenticated && !sessionLoading && !sessionError;
  const dashboard = useAccountDashboard(services, Boolean(enabled), 'tokens');

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
      <TokensTab
        tokens={dashboard.tokens}
        loading={dashboard.tokensLoading}
        error={dashboard.tokensError}
        busy={dashboard.tokensLoading}
        onRevoke={dashboard.revokeToken}
        onRetry={() => void dashboard.reloadTokens()}
      />
    </AccountSettingsAccessGate>
  );
}

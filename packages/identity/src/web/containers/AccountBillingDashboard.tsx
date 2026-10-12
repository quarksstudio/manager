import { useEffect } from 'react';
import { useAccountDashboard } from '../../hooks/useAccountDashboard';
import type { AccountDashboardServices } from '../../application/account-dashboard.port';
import { BillingTab } from '../components/BillingTab';

export function AccountBillingDashboard({
  username,
  services,
  sessionLoading = false,
  authenticated,
  sessionError,
  onRetrySession,
  onNavigate,
}: {
  username: string;
  services: AccountDashboardServices;
  sessionLoading?: boolean;
  authenticated: boolean;
  sessionError?: string;
  onRetrySession?: () => void;
  onNavigate: (username: string) => void;
}) {
  const enabled = authenticated && !sessionLoading && !sessionError;
  const dashboard = useAccountDashboard(services, enabled, 'billing');

  useEffect(() => {
    if (dashboard.profile?.username && dashboard.profile.username !== username)
      onNavigate(dashboard.profile.username);
  }, [dashboard.profile, username, onNavigate]);

  if (sessionLoading) return <p role="status">Loading session…</p>;
  if (sessionError)
    return (
      <>
        <p role="alert">Could not load session.</p>
        {onRetrySession && (
          <button type="button" onClick={onRetrySession}>
            Retry
          </button>
        )}
      </>
    );
  if (!authenticated)
    return (
      <p>
        <a href="/login" className="underline">
          Sign in
        </a>{' '}
        to manage your subscription.
      </p>
    );
  if (!dashboard.profile)
    return (
      <p role={dashboard.profileError ? 'alert' : 'status'}>
        {dashboard.profileLoading ? 'Loading account…' : dashboard.profileError}
      </p>
    );
  if (dashboard.profile.username !== username)
    return <p role="status">Opening your account…</p>;
  if (!dashboard.billing)
    return (
      <>
        <p role={dashboard.billingError ? 'alert' : 'status'}>
          {dashboard.billingLoading
            ? 'Loading subscription…'
            : dashboard.billingError}
        </p>
        {dashboard.billingError && (
          <button
            type="button"
            className="mt-3 underline"
            onClick={() => void dashboard.reloadBilling()}
          >
            Retry
          </button>
        )}
      </>
    );

  return (
    <BillingTab
      billing={dashboard.billing}
      loading={dashboard.billingLoading}
      error={dashboard.billingError}
      busy={dashboard.billingLoading}
      preview={services.preview}
      onSetPrivate={dashboard.setPrivateDistribution}
      onRetry={() => void dashboard.reloadBilling()}
    />
  );
}

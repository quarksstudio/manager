import { useEffect, type ReactNode } from 'react';
import type { AccountProfile } from '../../application/account-dashboard.port';

export interface AccountSettingsAccessProps {
  username: string;
  sessionLoading?: boolean;
  authenticated: boolean;
  sessionError?: string;
  onRetrySession?: () => void;
  onNavigate: (username: string) => void;
}

export function AccountSettingsAccessGate({
  username,
  sessionLoading = false,
  authenticated,
  sessionError,
  onRetrySession,
  onNavigate,
  profile,
  profileLoading,
  profileError,
  onRetryProfile,
  children,
}: AccountSettingsAccessProps & {
  profile: AccountProfile | null;
  profileLoading: boolean;
  profileError: string;
  onRetryProfile: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (profile?.username && profile.username !== username)
      onNavigate(profile.username);
  }, [profile, username, onNavigate]);

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
        to manage your account.
      </p>
    );
  if (!profile)
    return (
      <>
        <p role={profileError ? 'alert' : 'status'}>
          {profileLoading ? 'Loading settings…' : profileError}
        </p>
        {!profileLoading && profileError && (
          <button
            type="button"
            onClick={onRetryProfile}
            className="mt-4 underline"
          >
            Retry
          </button>
        )}
      </>
    );
  if (profile.username !== username)
    return <p role="status">Opening your account under @{profile.username}…</p>;
  return children;
}

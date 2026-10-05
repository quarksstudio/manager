import { useEffect } from 'react';
import { useUserSettings } from '../../hooks/useUserSettings';
import type { UserSettingsServices } from '../../application/user-settings.port';
import { SettingsForm } from '../components/SettingsForm';

export function UserProfileSettings({
  username,
  services,
  sessionLoading = false,
  authenticated,
  sessionError,
  onRetrySession,
  saved = false,
  onNavigate,
}: {
  username: string;
  services: UserSettingsServices;
  sessionLoading?: boolean;
  authenticated: boolean;
  sessionError?: string;
  onRetrySession?: () => void;
  saved?: boolean;
  onNavigate: (username: string, saved: boolean) => void;
}) {
  const { profile, loading, saving, error, load, save } = useUserSettings(
    services,
    authenticated && !sessionLoading && !sessionError,
    (profile) => onNavigate(profile.username, true),
  );
  useEffect(() => {
    if (profile && profile.username !== username)
      onNavigate(profile.username, false);
  }, [profile, username, onNavigate]);
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-6 text-2xl font-semibold">Profile settings</h1>
      {sessionLoading ? (
        <p role="status">Loading session…</p>
      ) : sessionError ? (
        <>
          <p role="alert">Could not load session.</p>
          <button type="button" onClick={onRetrySession}>
            Retry
          </button>
        </>
      ) : !authenticated ? (
        <p>
          <a href="/login" className="underline">
            Sign in
          </a>{' '}
          to edit your profile.
        </p>
      ) : !profile ? (
        <>
          <p role={error ? 'alert' : 'status'}>
            {loading ? 'Loading settings…' : error}
          </p>
          {!loading && error && (
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 underline"
            >
              Retry
            </button>
          )}
        </>
      ) : profile.username !== username ? (
        <p role="status">Opening your settings…</p>
      ) : (
        <>
          {saved && (
            <p role="status" className="mb-4">
              Profile saved.
            </p>
          )}
          <SettingsForm
            key={profile.id}
            profile={profile}
            saving={saving}
            error={error}
            onSave={save}
          />
        </>
      )}
    </main>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { QuarkTheme } from '@quarks.studio/web-ui';
import { useIdentitySession } from '../hooks/useIdentitySession';
import { useUserSettings } from '../hooks/useUserSettings';
import { userSettingsServices } from '../infrastructure/user-settings-services';
import type {
  UserSettings,
  UserSettingsChanges,
  UserSettingsServices,
} from '../application/user-settings.port';

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

function SettingsForm({
  profile,
  saving,
  error,
  onSave,
}: {
  profile: UserSettings;
  saving: boolean;
  error: string;
  onSave: (changes: UserSettingsChanges) => Promise<void>;
}) {
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [validation, setValidation] = useState('');
  const changed =
    (username.trim() !== profile.username &&
      username.trim().toLowerCase() !== profile.username) ||
    displayName.trim() !== (profile.displayName ?? '');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const changes: UserSettingsChanges = {};
        if (username.trim() !== profile.username) {
          const normalized = username.trim().toLowerCase();
          if (!/^[a-z0-9_-]{3,30}$/.test(normalized)) {
            setValidation('Use 3–30 letters, numbers, underscores or hyphens.');
            return;
          }
          if (normalized !== profile.username) changes.username = normalized;
        }
        if (displayName.trim() !== profile.displayName) {
          if (!displayName.trim()) {
            setValidation('Name is required.');
            return;
          }
          changes.displayName = displayName.trim();
        }
        setValidation('');
        void onSave(changes);
      }}
    >
      <label htmlFor="settings-username" className="block text-sm">
        Username
      </label>
      <input
        id="settings-username"
        value={username}
        onChange={(event) => {
          setUsername(event.target.value);
          setValidation('');
        }}
        disabled={saving}
        autoComplete="username"
        aria-describedby="settings-username-help"
        className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
      />
      <p id="settings-username-help" className="mt-2 text-xs text-slate-400">
        3–30 letters, numbers, underscores or hyphens.
      </p>
      <label htmlFor="settings-name" className="mt-5 block text-sm">
        Name
      </label>
      <input
        id="settings-name"
        value={displayName}
        onChange={(event) => {
          setDisplayName(event.target.value);
          setValidation('');
        }}
        disabled={saving}
        autoComplete="name"
        className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
      />
      {(validation || error) && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {validation || error}
        </p>
      )}
      <div className="mt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={saving || !changed}
          className="rounded border border-slate-700 px-4 py-2 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <a
          href={`/~/${encodeURIComponent(profile.username)}`}
          className="text-sm underline"
        >
          Back to profile
        </a>
      </div>
    </form>
  );
}

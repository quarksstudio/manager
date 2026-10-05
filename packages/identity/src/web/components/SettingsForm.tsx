import { useState } from 'react';
import type {
  UserSettings,
  UserSettingsChanges,
} from '../../application/user-settings.port';

export function SettingsForm({
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

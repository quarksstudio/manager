import { useEffect, useState } from 'react';
import type {
  UserSettings,
  UserSettingsChanges,
} from '../../application/user-settings.port';
import { EmailsSettingsCard } from './EmailsSettingsCard';
import { ProfileSettingsCard } from './ProfileSettingsCard';

export function SettingsForm({
  profile,
  saving,
  error,
  onSave,
  checkEmail,
}: {
  profile: UserSettings;
  saving: boolean;
  error: string;
  onSave: (changes: UserSettingsChanges) => Promise<void>;
  checkEmail: (email: string) => Promise<{ email: string; available: boolean }>;
}) {
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [linkedEmails, setLinkedEmails] = useState(
    profile.linkedEmails?.filter(Boolean) ??
      (profile.email ? [profile.email] : []),
  );
  const [publicEmail, setPublicEmail] = useState(profile.publicEmail ?? null);
  const [validation, setValidation] = useState('');
  useEffect(() => {
    setUsername(profile.username);
    setDisplayName(profile.displayName ?? '');
    setLinkedEmails(
      profile.linkedEmails?.filter(Boolean) ??
        (profile.email ? [profile.email] : []),
    );
    setPublicEmail(profile.publicEmail ?? null);
  }, [profile]);

  const changed =
    (username.trim() !== profile.username &&
      username.trim().toLowerCase() !== profile.username) ||
    displayName.trim() !== (profile.displayName ?? '') ||
    linkedEmails.join('|') !==
      (
        profile.linkedEmails?.filter(Boolean) ??
        (profile.email ? [profile.email] : [])
      ).join('|') ||
    publicEmail !== (profile.publicEmail ?? null);
  return (
    <form
      className="space-y-6"
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
        const originalEmails =
          profile.linkedEmails?.filter(Boolean) ??
          (profile.email ? [profile.email] : []);
        if (linkedEmails.join('|') !== originalEmails.join('|'))
          changes.linkedEmails = linkedEmails;
        if (publicEmail !== (profile.publicEmail ?? null))
          changes.publicEmail = publicEmail;
        setValidation('');
        void onSave(changes);
      }}
    >
      <EmailsSettingsCard
        linkedEmails={linkedEmails}
        publicEmail={publicEmail}
        primaryEmail={profile.email ?? null}
        saving={saving}
        checkEmail={checkEmail}
        onChange={(emails, selectedPublicEmail) => {
          setLinkedEmails(emails);
          setPublicEmail(selectedPublicEmail);
        }}
      />
      <ProfileSettingsCard
        username={username}
        displayName={displayName}
        saving={saving}
        changed={changed}
        error={error}
        validation={validation}
        profileUrl={`/~/${encodeURIComponent(profile.username)}`}
        onUsernameChange={(value) => {
          setUsername(value);
          setValidation('');
        }}
        onDisplayNameChange={(value) => {
          setDisplayName(value);
          setValidation('');
        }}
      />
    </form>
  );
}

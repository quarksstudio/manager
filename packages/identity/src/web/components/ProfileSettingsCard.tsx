import { Button, Card, Input } from 'antd';

export function ProfileSettingsCard({
  username,
  displayName,
  saving,
  changed,
  error,
  validation,
  profileUrl,
  onUsernameChange,
  onDisplayNameChange,
}: {
  username: string;
  displayName: string;
  saving: boolean;
  changed: boolean;
  error: string;
  validation: string;
  profileUrl: string;
  onUsernameChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
}) {
  return (
    <Card
      title="Public profile"
      className="!bg-slate-900 !border-slate-800 mb-16"
      extra={
        <Button
          type="primary"
          htmlType="submit"
          loading={saving}
          disabled={saving || !changed}
        >
          Save
        </Button>
      }
    >
      <div className="max-w-xl">
        <label htmlFor="settings-username" className="block text-sm">
          Username
        </label>
        <Input
          id="settings-username"
          aria-label="Username"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          disabled={saving}
          autoComplete="username"
          aria-describedby="settings-username-help"
          className="mt-2"
        />
        <p id="settings-username-help" className="mt-2 text-xs text-slate-400">
          3–30 letters, numbers, underscores or hyphens.
        </p>
        <label htmlFor="settings-name" className="mt-5 block text-sm">
          Name
        </label>
        <Input
          id="settings-name"
          aria-label="Name"
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          disabled={saving}
          autoComplete="name"
          className="mt-2"
        />
        {(validation || error) && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {validation || error}
          </p>
        )}
      </div>
    </Card>
  );
}

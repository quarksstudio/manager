import { useState, type KeyboardEvent } from 'react';
import { Alert, Button, Card, Input } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { EmailAvailability } from '../../application/user-settings.port';
import { MonoValue } from './MonoValue';

export function EmailsSettingsCard({
  linkedEmails,
  publicEmail,
  primaryEmail,
  saving,
  onChange,
  checkEmail,
}: {
  linkedEmails: string[];
  publicEmail: string | null;
  primaryEmail: string | null;
  saving: boolean;
  onChange: (linkedEmails: string[], publicEmail: string | null) => void;
  checkEmail: (email: string) => Promise<EmailAvailability>;
}) {
  const [newEmail, setNewEmail] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const privateSelected = publicEmail === null;

  async function addEmail() {
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (linkedEmails.some((item) => item.toLowerCase() === email)) {
      setEmailError('That email is already added.');
      return;
    }

    setCheckingEmail(true);
    setEmailError('');
    try {
      const result = await checkEmail(email);
      if (!result.available) {
        setEmailError('That email is already used by another account.');
        return;
      }
      onChange([...linkedEmails, email], publicEmail);
      setNewEmail('');
    } catch {
      setEmailError('Could not check this email. Please try again.');
    } finally {
      setCheckingEmail(false);
    }
  }

  function onEmailKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void addEmail();
    }
  }

  function removeEmail(email: string) {
    onChange(
      linkedEmails.filter((item) => item.toLowerCase() !== email.toLowerCase()),
      publicEmail,
    );
  }

  return (
    <Card
      title="Emails"
      className="!bg-slate-900 !border-slate-800 mb-16"
      extra={
        <Button
          htmlType="button"
          size="small"
          aria-pressed={privateSelected}
          className={
            privateSelected ? '!border-emerald-600 !text-emerald-400' : ''
          }
          onClick={() => onChange(linkedEmails, null)}
          disabled={privateSelected || saving}
        >
          Make private
        </Button>
      }
    >
      <ul className="space-y-2">
        {linkedEmails.map((email) => {
          const isPrimary = primaryEmail?.toLowerCase() === email.toLowerCase();
          const isPublic = publicEmail?.toLowerCase() === email.toLowerCase();
          return (
            <li
              key={email}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <MonoValue value={email} />
                {isPublic && (
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                    Public
                  </span>
                )}
                {isPrimary && (
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    Primary
                  </span>
                )}
              </div>
              {!isPublic && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    htmlType="button"
                    size="small"
                    aria-pressed={false}
                    onClick={() => onChange(linkedEmails, email)}
                    disabled={saving}
                  >
                    Make public
                  </Button>
                  {!isPrimary && (
                    <Button
                      htmlType="button"
                      size="small"
                      aria-label={`Remove ${email}`}
                      icon={<DeleteOutlined />}
                      onClick={() => removeEmail(email)}
                      disabled={saving}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 max-w-xl">
        <div className="flex items-center gap-2">
          <Input
            aria-label="New email"
            value={newEmail}
            onChange={(event) => {
              setNewEmail(event.target.value);
              setEmailError('');
            }}
            onKeyDown={onEmailKeyDown}
            placeholder="Add another email…"
            disabled={saving || checkingEmail}
          />
          <Button
            htmlType="button"
            onClick={() => void addEmail()}
            disabled={saving || checkingEmail}
            loading={checkingEmail}
          >
            Add
          </Button>
        </div>
        {emailError && (
          <Alert type="error" showIcon className="mt-2" message={emailError} />
        )}
      </div>
    </Card>
  );
}

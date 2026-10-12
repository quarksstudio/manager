import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Switch, Tag } from 'antd';
import { QuarkTheme } from '@quarks.studio/web-ui';
import type {
  IntegrationClient,
  IntegrationSettings,
  IntegrationTarget,
} from '../../domain/account-dashboard';
import { PreviewBadge } from './PreviewBadge';

export interface IntegrationsTabProps {
  settings: IntegrationSettings;
  loading: boolean;
  saving: boolean;
  error: string;
  saved: boolean;
  preview?: boolean;
  onSave: (settings: IntegrationSettings) => Promise<boolean>;
  onRetry?: () => void;
}

const CLIENT_LABELS: Record<IntegrationClient, string> = {
  'claude-desktop': 'Claude Desktop',
  vscode: 'VS Code',
  cursor: 'Cursor',
  gemini: 'Gemini',
};

const CLIENT_HINT: Record<IntegrationClient, string> = {
  'claude-desktop':
    'Writes mcp servers into claude_desktop_config.json for skill injection.',
  vscode: 'Exposes custom function declarations to the editor build helper.',
  cursor: 'Registers the loopback skill feed with the Cursor agent.',
  gemini:
    'Publishes skills to the Gemini code assist through the loopback port.',
};

function cloneSettings(settings: IntegrationSettings): IntegrationSettings {
  return {
    ...settings,
    targets: settings.targets.map((target) => ({ ...target })),
  };
}

/** Maps local LLM clients and the storage target for injected skills. */
export function IntegrationsTab({
  settings,
  loading,
  saving,
  error,
  saved,
  preview,
  onSave,
  onRetry,
}: IntegrationsTabProps) {
  const [draft, setDraft] = useState<IntegrationSettings | null>(null);

  useEffect(() => {
    setDraft(cloneSettings(settings));
  }, [settings]);

  function updateTarget(
    client: IntegrationClient,
    patch: Partial<IntegrationTarget>,
  ) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        targets: current.targets.map((target) =>
          target.client === client ? { ...target, ...patch } : target,
        ),
      };
    });
  }

  async function save() {
    if (!draft) return;
    await onSave(draft);
  }

  return (
    <QuarkTheme>
      <Card
        title="AI integrations"
        extra={preview ? <PreviewBadge /> : undefined}
        className="!bg-slate-900 !border-slate-800"
      >
        <p className="mb-4 text-sm text-slate-400">
          Map local LLM clients so installing a Quark skill injects it into
          those agents automatically.
        </p>

        {error && (
          <Alert
            type="error"
            showIcon
            className="mb-3"
            message={error}
            action={
              onRetry ? (
                <Button size="small" onClick={onRetry}>
                  Retry
                </Button>
              ) : undefined
            }
          />
        )}

        {loading ? (
          <p role="status" className="text-sm text-slate-400">
            Loading integrations…
          </p>
        ) : (
          <div className="space-y-5">
            {draft?.targets.map((target) => (
              <div key={target.client}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {CLIENT_LABELS[target.client]} <Tag>{target.client}</Tag>
                    </p>
                    <p className="text-sm text-slate-400">
                      {CLIENT_HINT[target.client]}
                    </p>
                  </div>
                  <Switch
                    aria-label={`Enable ${CLIENT_LABELS[target.client]}`}
                    checked={target.enabled}
                    onChange={(enabled) =>
                      updateTarget(target.client, { enabled })
                    }
                  />
                </div>

                {target.enabled && (
                  <div className="mt-3 space-y-3 rounded-lg border border-slate-800 p-3">
                    {target.configPath !== null && (
                      <div>
                        <label
                          className="mb-1 block text-xs font-medium text-slate-400"
                          htmlFor={`${target.client}-config`}
                        >
                          Config path
                        </label>
                        <Input
                          id={`${target.client}-config`}
                          aria-label={`${CLIENT_LABELS[target.client]} config path`}
                          value={target.configPath}
                          onChange={(event) =>
                            updateTarget(target.client, {
                              configPath: event.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                    {target.ssePort !== null && (
                      <div>
                        <label
                          className="mb-1 block text-xs font-medium text-slate-400"
                          htmlFor={`${target.client}-sse`}
                        >
                          Loopback SSE port
                        </label>
                        <Input
                          id={`${target.client}-sse`}
                          aria-label={`${CLIENT_LABELS[target.client]} SSE port`}
                          inputMode="numeric"
                          value={String(target.ssePort)}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            updateTarget(target.client, {
                              ssePort:
                                Number.isInteger(parsed) && parsed > 0
                                  ? parsed
                                  : null,
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="skills-storage"
              >
                Skill storage location
              </label>
              <Input
                id="skills-storage"
                aria-label="Skill storage location"
                value={draft?.storagePath ?? ''}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, storagePath: event.target.value }
                      : current,
                  )
                }
                className="max-w-md"
              />
              <p className="mt-1 text-xs text-slate-400">
                Defaults to{' '}
                <code className="font-mono text-slate-300">
                  ~/.quark/skills/
                </code>{' '}
                on desktop.
              </p>
            </div>

            {saved && !error && (
              <p role="status" className="text-sm text-emerald-400">
                Integration settings saved.
              </p>
            )}

            <Button
              type="primary"
              loading={saving}
              disabled={!draft}
              onClick={() => void save()}
            >
              Save integration settings
            </Button>
          </div>
        )}
      </Card>
    </QuarkTheme>
  );
}

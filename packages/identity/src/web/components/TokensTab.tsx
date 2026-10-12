import { Alert, Button, Card, Empty, Popconfirm, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { QuarkTheme, formatDate } from '@quarks.studio/web-ui';
import type {
  PersonalAccessToken,
  TokenScope,
} from '../../domain/account-dashboard';
import { MonoValue } from './MonoValue';

export interface TokensTabProps {
  tokens: PersonalAccessToken[];
  loading: boolean;
  error: string;
  busy: boolean;
  onRevoke: (tokenId: string) => Promise<void>;
  onRetry?: () => void;
}

const SCOPE_LABELS: Record<TokenScope, string> = {
  'read-only': 'Read-only',
  'publish-packages': 'Publish packages',
  'audit-access': 'Audit access',
};

const SCOPE_COLORS: Record<TokenScope, string> = {
  'read-only': 'blue',
  'publish-packages': 'green',
  'audit-access': 'purple',
};

/**
 * The registry of credentials authenticated with this account. A token is
 * minted by the client that signs in (browser, CLI or desktop); revoking one
 * signs every device out, because Firebase cannot invalidate a single ID token.
 */
export function TokensTab({
  tokens,
  loading,
  error,
  busy,
  onRevoke,
  onRetry,
}: TokensTabProps) {
  const columns: ColumnsType<PersonalAccessToken> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, token) => <MonoValue value={token.name} />,
    },
    {
      title: 'Scope',
      key: 'scope',
      render: (_, token) => (
        <Tag color={SCOPE_COLORS[token.scope]}>{SCOPE_LABELS[token.scope]}</Tag>
      ),
    },
    {
      title: 'Created',
      key: 'createdAt',
      render: (_, token) => formatDate(token.createdAt),
    },
    {
      title: 'Last used',
      key: 'lastUsedAt',
      render: (_, token) =>
        token.lastUsedAt ? formatDate(token.lastUsedAt) : '—',
    },
    {
      title: 'Expires',
      key: 'expiresAt',
      render: (_, token) => formatDate(token.expiresAt),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, token) => (
        <Popconfirm
          title="Revoke this token?"
          description="Clients using it, and every other signed-in device, will be denied immediately."
          okText="Revoke"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={() => void onRevoke(token.id)}
        >
          <Button danger size="small" disabled={busy}>
            Revoke
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <QuarkTheme>
      <Card title="API tokens" className="!bg-slate-900 !border-slate-800">
        <p className="mb-4 text-sm text-slate-400">
          Credentials registered by the clients signed in to this account. They
          authorize the CLI, the browser and audit clients against the registry.
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

        <Table
          rowKey="id"
          columns={columns}
          dataSource={tokens}
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No tokens yet."
              />
            ),
          }}
        />
      </Card>
    </QuarkTheme>
  );
}

import {
  Alert,
  Button,
  Card,
  Empty,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { QuarkTheme, formatDate, formatPrice } from '@quarks.studio/web-ui';
import type {
  BillingDashboard,
  StandaloneCredit,
} from '../../domain/account-dashboard';
import { MonoValue } from './MonoValue';
import { PreviewBadge } from './PreviewBadge';

export interface BillingTabProps {
  billing: BillingDashboard;
  loading: boolean;
  error: string;
  busy: boolean;
  preview?: boolean;
  onSetPrivate: (enabled: boolean) => Promise<boolean>;
  onRetry?: () => void;
}

const TIER_LABELS: Record<StandaloneCredit['tier'], string> = {
  TIER_3: 'Tier 3 · $50',
  TIER_4: 'Tier 4 · $100',
};

/** Subscription status, certification credits and the billing portal link. */
export function BillingTab({
  billing,
  loading,
  error,
  busy,
  preview,
  onSetPrivate,
  onRetry,
}: BillingTabProps) {
  const { subscription, credits, portalUrl } = billing;
  const remaining = Math.max(
    0,
    credits.tier2MonthlyLimit - credits.tier2MonthlyUsed,
  );

  const columns: ColumnsType<StandaloneCredit> = [
    {
      title: 'Certification',
      key: 'tier',
      render: (_, credit) => (
        <Tag color="volcano">{TIER_LABELS[credit.tier]}</Tag>
      ),
    },
    {
      title: 'Package',
      key: 'packageId',
      render: (_, credit) => <MonoValue value={credit.packageId} />,
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_, credit) => formatPrice(credit.amountCents, credit.currency),
    },
    {
      title: 'Paid',
      key: 'paidAt',
      render: (_, credit) => formatDate(credit.paidAt),
    },
  ];

  const privateToggle = (
    <Switch
      aria-label="Enable hosting private packages and repositories"
      checked={subscription.isPrivateDistributionEnabled}
      disabled={!subscription.pro || busy}
      onChange={(enabled) => {
        void onSetPrivate(enabled);
      }}
    />
  );

  return (
    <QuarkTheme>
      <section aria-label="Billing" aria-busy={loading} className="space-y-6">
        {error && (
          <Alert
            type="error"
            showIcon
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

        <Card
          title="Certification credits"
          className="!bg-slate-900 !border-slate-800"
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={credits.standalone}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No standalone certifications yet."
                />
              ),
            }}
          />
        </Card>
      </section>
    </QuarkTheme>
  );
}

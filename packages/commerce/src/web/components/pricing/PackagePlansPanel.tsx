import type {
  CatalogProduct,
  SubscriptionRecord,
} from '@quarks.studio/commerce';
import { formatPrice } from '@quarks.studio/commerce';
import { Button, List, Tag, Typography } from 'antd';

import { formatDate } from '@quarks.studio/web-ui';
import { QuarkTheme } from '@quarks.studio/web-ui';

export interface PackagePlansPanelProps {
  packageName: string;
  /** The user's own subscriptions to this package, already filtered. */
  plans: SubscriptionRecord[];
  /** Local plans page, e.g. `/packages/demo/payment`. */
  plansBase: string;
  /** Catalog rows, used to turn a `productId` into a name. */
  catalog?: CatalogProduct[];
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
  past_due: 'Pago atrasado',
  error: 'Error',
};

/**
 * "Your plans" on the package page. `GET /v1/subscriptions/me` has no `system`
 * filter, so the caller filters by package and the panel only reports what it
 * is handed. Cancellation is not wired: the server route exists but nothing
 * here may pretend a button works.
 */
export function PackagePlansPanel({
  packageName,
  plans,
  plansBase,
  catalog = [],
}: PackagePlansPanelProps) {
  const active = plans.filter((plan) => plan.status === 'active');
  const planName = (productId: string) =>
    catalog.find((product) => product.id === productId)?.name ?? productId;

  return (
    <QuarkTheme>
      <section
        data-testid="package-plans-panel"
        className="rounded-lg border border-slate-200 bg-white p-5"
      >
        <header className="mb-3 flex flex-wrap items-center gap-3">
          <Typography.Title level={3} className="!mb-0 !text-base">
            Tus planes
          </Typography.Title>
          {active.length > 0 && (
            <Tag color="green">
              {active.length} activo{active.length === 1 ? '' : 's'}
            </Tag>
          )}
        </header>

        <Typography.Paragraph type="secondary" className="!mb-4 text-sm">
          An active subscription adds monthly credit to {packageName}.
        </Typography.Paragraph>

        {plans.length === 0 ? (
          <Typography.Text
            type="secondary"
            data-testid="package-plans-empty"
            className="text-sm"
          >
            You have no active plan for this package.
          </Typography.Text>
        ) : (
          <List
            size="small"
            dataSource={plans}
            renderItem={(plan) => (
              <List.Item data-testid={`subscription-${plan.id}`}>
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {planName(plan.productId)}
                  </span>
                  <span className="text-sm text-slate-500">
                    {formatPrice(plan.amountCents, plan.currency)}
                    {plan.currentPeriodEnd
                      ? ` · renueva ${formatDate(plan.currentPeriodEnd)}`
                      : ''}
                  </span>
                  <Tag>{STATUS_LABEL[plan.status] ?? plan.status}</Tag>
                </div>
              </List.Item>
            )}
          />
        )}

        <div className="mt-4">
          <Button type="primary" href={plansBase}>
            See plans
          </Button>
        </div>
      </section>
    </QuarkTheme>
  );
}

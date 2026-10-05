import type { CatalogProduct, PlanSystems } from '../../index';
import { Typography } from 'antd';

import { QuarkTheme } from '@quarks.studio/web-ui';
import { PaymentSystemButtons } from './PaymentSystemButtons';
import { PricingCard } from '../components/PricingCard';
import { SystemHints } from '../components/SystemHints';

export interface PlanGridProps {
  plans: CatalogProduct[];
  systems: PlanSystems;
  /**
   * The package that will own the subscription. The global catalog has none, so
   * it shows prices and no button: a disabled link that 400s is worse than no
   * button at all.
   */
  packageId?: string;
  apiBaseUrl?: string;
}

/**
 * Plans are already sorted by price. Only a system that can sign a plan up on
 * its own gets a button; the rest become a hint below the grid.
 */
export function PlanGrid({
  plans,
  systems,
  packageId,
  apiBaseUrl,
}: PlanGridProps) {
  if (plans.length === 0) {
    return (
      <QuarkTheme>
        <Typography.Text
          type="secondary"
          data-testid="plans-empty"
          className="text-sm"
        >
          No plans published yet.
        </Typography.Text>
      </QuarkTheme>
    );
  }

  return (
    <QuarkTheme>
      <div>
        <div
          data-testid="plan-grid"
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {plans.map((product) => (
            <PricingCard
              key={product.id}
              product={product}
              badge={product.active ? undefined : 'Inactive'}
            >
              {!packageId ? (
                <Typography.Text type="secondary" className="text-sm">
                  Pick a package to subscribe to this plan.
                </Typography.Text>
              ) : systems.eligible.length > 0 ? (
                <PaymentSystemButtons
                  target={{ kind: 'plan', packageId, productId: product.id }}
                  systems={systems.eligible}
                  apiBaseUrl={apiBaseUrl}
                />
              ) : (
                <Typography.Text type="secondary" className="text-sm">
                  No payment system is available in your country.
                </Typography.Text>
              )}
            </PricingCard>
          ))}
        </div>
        <SystemHints pending={systems.pending} />
      </div>
    </QuarkTheme>
  );
}

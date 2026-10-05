import type { PaymentSystem, TierOffer } from '../../index';
import { tierName } from '../../index';
import { Divider, Tag, Typography } from 'antd';

import { QuarkTheme } from '@quarks.studio/web-ui';
import { TIER_META } from '@quarks.studio/web-ui';
import { PaymentSystemButtons } from './PaymentSystemButtons';

export interface TierMatrixProps {
  offers: TierOffer[];
  systems: PaymentSystem[];
  packageId: string;
  versionId: string;
  apiBaseUrl?: string;
}

/**
 * The staircase in ascending tier order, which is not price order: tier 4 is
 * the most expensive and also the highest rank. Every system gets a button
 * because every gateway implements `createPaymentLink`; only the ladder
 * decides who may buy.
 */
export function TierMatrix({
  offers,
  systems,
  packageId,
  versionId,
  apiBaseUrl,
}: TierMatrixProps) {
  if (offers.length === 0) {
    return (
      <QuarkTheme>
        <Typography.Text
          type="secondary"
          data-testid="tiers-empty"
          className="text-sm"
        >
          No certifications published yet.
        </Typography.Text>
      </QuarkTheme>
    );
  }

  return (
    <QuarkTheme>
      <div data-testid="tier-matrix" className="space-y-4">
        {offers.map(({ product, held, purchasable }) => {
          const meta = TIER_META[tierName(product.tier)];
          return (
            <section
              key={product.id}
              data-testid={`tier-${product.id}`}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <header className="mb-3 flex flex-wrap items-center gap-3">
                <Typography.Title level={3} className="!mb-0 !text-base">
                  {meta.title}
                </Typography.Title>
                <Tag color={meta.color}>{meta.badge}</Tag>
                {!purchasable && <Tag>{held ? 'Held' : 'Unavailable'}</Tag>}
              </header>

              <Divider className="!my-3" />

              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="m-0 text-sm text-slate-600">
                  {product.description || 'Certification for this level.'}
                </p>
                {purchasable ? (
                  <PaymentSystemButtons
                    target={{
                      kind: 'certification',
                      packageId,
                      versionId,
                      productId: product.id,
                    }}
                    systems={systems}
                    apiBaseUrl={apiBaseUrl}
                  />
                ) : (
                  <Typography.Text type="secondary" className="text-sm">
                    {held
                      ? 'You already hold this level.'
                      : 'This level is not available.'}
                  </Typography.Text>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </QuarkTheme>
  );
}

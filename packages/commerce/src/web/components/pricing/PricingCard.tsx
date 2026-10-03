import type { CatalogProduct } from '@quarks.studio/commerce';
import { formatPrice } from '@quarks.studio/commerce';
import { List, Tag, Typography } from 'antd';

import { QuarkTheme } from '@quarks.studio/web-ui';

export interface PricingCardProps {
  product: CatalogProduct;
  badge?: string;
  /** Rendered under the features; this is where the purchase link lives. */
  children?: React.ReactNode;
}

export function PricingCard({ product, badge, children }: PricingCardProps) {
  return (
    <QuarkTheme>
      <article
        data-testid={`plan-${product.id}`}
        className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5"
      >
        <header className="mb-3 flex flex-wrap items-center gap-2">
          <Typography.Title level={3} className="!mb-0 !text-base">
            {product.name}
          </Typography.Title>
          {badge && (<Tag>{badge}</Tag>)}
        </header>

        <p
          data-testid={`plan-price-${product.id}`}
          className="mb-1 text-2xl font-semibold text-slate-900"
        >
          {formatPrice(product.amountCents, product.currency)}
          {product.period && (
            <span className="ml-1 text-sm font-normal text-slate-500">
              /{product.period === 'month' ? 'mes' : product.period}
            </span>
          )}
        </p>

        {product.description && (
          <Typography.Paragraph type="secondary" className="!mb-3 text-sm">
            {product.description}
          </Typography.Paragraph>
        )}

        {product.features.length > 0 ? (
          <List
            size="small"
            className="!mb-4 flex-1"
            dataSource={product.features}
            renderItem={(feature) => <List.Item>{feature}</List.Item>}
          />
        ) : (
          <div className="flex-1" />
        )}

        {children}
      </article>
    </QuarkTheme>
  );
}

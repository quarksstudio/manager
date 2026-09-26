import type { ComponentType } from 'react';
import { Card, Typography } from 'antd';

import { PackageRankCard, type PackageRankVariant } from './PackageRankCard';
import type { LandingPackage } from './types';

export interface PackageRankColumnProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  variant: PackageRankVariant;
  items: LandingPackage[];
}

export function PackageRankColumn({
  title,
  icon: ColumnIcon,
  variant,
  items,
}: PackageRankColumnProps) {
  return (
    <Card size="small" className="h-full">
      <Card.Meta
        avatar={<ColumnIcon className="text-base" />}
        title={
          <Typography.Title level={5} className="!mb-0 !uppercase !text-xs">
            {title}
          </Typography.Title>
        }
      />
      <div className="mt-4">
        {items.length === 0 ? (
          <Typography.Text type="secondary" className="text-sm">
            No results
          </Typography.Text>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={`${variant}-${item.name}`}>
                <PackageRankCard item={item} variant={variant} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

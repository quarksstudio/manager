import { Tag, Typography } from 'antd';

import type { CertificationBadge } from '../../lib/certification';
import { QuarkTheme } from '../../lib/theme';
import type { TierColor } from '../landing/tiers';

function tierColor(tier?: string): TierColor {
  const key = (tier ?? '').toUpperCase();
  if (key === 'TIER_2') return 'blue';
  if (key === 'TIER_3') return 'green';
  if (key === 'TIER_4') return 'gold';
  return 'default';
}

export interface PackageHeaderProps {
  name: string;
  badge: CertificationBadge | null;
  description?: string;
}

export function PackageHeader({
  name,
  badge,
  description,
}: PackageHeaderProps) {
  return (
    <QuarkTheme>
      <header data-testid="package-header" className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Typography.Title
            level={1}
            className="!mb-0 font-mono !text-2xl sm:!text-3xl"
          >
            {name}
          </Typography.Title>
          <Tag color={badge ? tierColor(badge.tier) : 'default'}>
            {badge?.label ?? 'Uncertified'}
          </Tag>
        </div>
        {description ? (
          <Typography.Paragraph
            type="secondary"
            className="!mb-0 max-w-3xl !text-base"
          >
            {description}
          </Typography.Paragraph>
        ) : null}
      </header>
    </QuarkTheme>
  );
}

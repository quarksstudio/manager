import {
  DownloadOutlined,
  EyeOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { Divider, Tag, Typography } from 'antd';

import { QuarkTheme } from '../../lib/theme';
import { PackageRankColumn } from './PackageRankColumn';
import { TIER_META } from './tiers';
import type { LandingTier, LandingTierColumns } from './types';

export interface LandingTierSectionProps {
  tier: LandingTier;
  columns: LandingTierColumns;
}

export function LandingTierSection({ tier, columns }: LandingTierSectionProps) {
  const meta = TIER_META[tier];
  return (
    <QuarkTheme>
      <section>
        <header className="mb-4 flex flex-wrap items-center gap-3">
          <Typography.Title level={2} className="!mb-0 !text-lg">
            {meta.title}
          </Typography.Title>
          <Tag color={meta.color}>{meta.badge}</Tag>
        </header>
        <Divider className="!my-4" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <PackageRankColumn
            title="Most Viewed"
            icon={EyeOutlined}
            variant="views"
            items={columns.mostViewed}
          />
          <PackageRankColumn
            title="Most Downloaded"
            icon={DownloadOutlined}
            variant="downloads"
            items={columns.mostDownloaded}
          />
          <PackageRankColumn
            title="Latest Certified"
            icon={SafetyOutlined}
            variant="certified"
            items={columns.latestCertified}
          />
        </div>
      </section>
    </QuarkTheme>
  );
}

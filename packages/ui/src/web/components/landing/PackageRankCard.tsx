import type { ComponentType } from 'react';
import {
  DownloadOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Button, Card, Flex, Tag, Typography } from 'antd';

import { formatCount, formatDate } from '../../lib/format';
import { truncateHash } from './tiers';
import type { LandingPackage } from './types';

export type PackageRankVariant = 'views' | 'downloads' | 'certified';

const METRIC_ICON: Record<
  PackageRankVariant,
  ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  views: EyeOutlined,
  downloads: DownloadOutlined,
  certified: SafetyCertificateOutlined,
};

export interface PackageRankCardProps {
  item: LandingPackage;
  variant: PackageRankVariant;
}

export function PackageRankCard({ item, variant }: PackageRankCardProps) {
  const MetricIcon = METRIC_ICON[variant];
  const metric =
    variant === 'views'
      ? formatCount(item.viewsCount ?? 0)
      : variant === 'downloads'
        ? formatCount(item.downloadsCount ?? 0)
        : formatDate(item.certifiedAt);
  return (
    <Card size="small" className="!border-colorSplit">
      <Flex vertical gap={8}>
        <Flex justify="space-between" align="center" gap={8}>
          <a
            href={item.href}
            className="min-w-0 truncate font-mono text-sm font-semibold"
          >
            {item.name}
          </a>
          {item.version ? (
            <Tag bordered className="shrink-0 font-mono">
              v{item.version}
            </Tag>
          ) : null}
        </Flex>
        <Typography.Text
          type="secondary"
          className="truncate font-mono !text-xs"
        >
          {variant === 'certified'
            ? metric
            : `sha256:${truncateHash(item.hash)}`}
        </Typography.Text>
        <Flex align="center" gap={6} className="!text-xs">
          <MetricIcon aria-hidden className="text-xs" />
          <span>{metric}</span>
        </Flex>
        <Button href={item.href} type="link" size="small" className="!p-0">
          View package
        </Button>
      </Flex>
    </Card>
  );
}

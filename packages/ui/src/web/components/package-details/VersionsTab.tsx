import { DownloadOutlined } from '@ant-design/icons';
import {
  sortVersions,
  type PackageVersion,
} from '@quarks.studio/registry/client';
import { List, Tag, Typography } from 'antd';

import { certificationBadge } from '../../lib/certification';
import { formatDate } from '../../lib/format';
import { QuarkTheme } from '../../lib/theme';
import type { TierColor } from '../landing/tiers';

function tierColor(tier?: string): TierColor {
  const key = (tier ?? '').toUpperCase();
  if (key === 'TIER_2') return 'blue';
  if (key === 'TIER_3') return 'green';
  if (key === 'TIER_4') return 'gold';
  return 'default';
}

export interface VersionsTabProps {
  packageName: string;
  versions: PackageVersion[];
  selectedVersion: string;
  onSelectVersion?: (version: string) => void;
  versionUrls?: Record<string, string>;
  downloadUrls?: Record<string, string>;
  onDownload?: (version: string) => void;
}

export function VersionsTab({
  packageName,
  versions,
  selectedVersion,
  onSelectVersion,
  onDownload,
  versionUrls,
  downloadUrls,
}: VersionsTabProps) {
  const ordered = sortVersions(versions);

  if (ordered.length === 0) {
    return (
      <QuarkTheme>
        <Typography.Text type="secondary">
          No published versions for {packageName}.
        </Typography.Text>
      </QuarkTheme>
    );
  }

  return (
    <QuarkTheme>
      <List
        data-testid="versions-list"
        bordered
        split
        dataSource={ordered}
        renderItem={(item) => {
          const badge = certificationBadge(item.certifications);
          const selected = item.version === selectedVersion;
          return (
            <List.Item
              className={selected ? '!bg-container' : undefined}
              actions={[
                <Typography.Text
                  key="date"
                  type="secondary"
                  className="text-sm"
                >
                  {formatDate(item.date)}
                </Typography.Text>,
                <a
                  key="download"
                  href={downloadUrls?.[item.version]}
                  aria-label={`Download version ${item.version}`}
                  onClick={() => onDownload?.(item.version)}
                >
                  <DownloadOutlined aria-hidden="true" />
                </a>,
              ]}
            >
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={versionUrls?.[item.version]}
                  data-testid={`select-${item.version}`}
                  aria-pressed={selected}
                  onClick={() => onSelectVersion?.(item.version)}
                  className="font-mono !text-sm !font-medium"
                >
                  {item.version}
                </a>
                <Tag color={badge ? tierColor(badge.tier) : 'default'}>
                  {badge?.label ?? 'Uncertified'}
                </Tag>
              </div>
            </List.Item>
          );
        }}
      />
    </QuarkTheme>
  );
}

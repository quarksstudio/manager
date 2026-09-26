import {
  sortVersions,
  type PackageVersion,
} from '@quarks.studio/registry/client';
import { List, Select, Tag, Typography } from 'antd';

import { formatDate } from '../../lib/format';
import { QuarkTheme } from '../../lib/theme';
import type { TierColor } from '../landing/tiers';

export interface CertificationRow {
  environment?: 'local';
  tier: string;
  status: string;
  approvedAt?: string;
  reportUrl?: string;
}

export interface CertsTabProps {
  versions: PackageVersion[];
  selectedVersion: string;
  onSelectVersion?: (version: string) => void;
  versionUrls?: Record<string, string>;
  certifications: CertificationRow[];
}

const STATUS_LABEL: Record<string, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
};

function statusColor(status: string): TierColor {
  if (status === 'approved') return 'green';
  if (status === 'rejected') return 'red';
  if (status === 'pending') return 'blue';
  return 'default';
}

function tierColor(tier?: string): TierColor {
  const key = (tier ?? '').toUpperCase();
  if (key === 'TIER_2') return 'blue';
  if (key === 'TIER_3') return 'green';
  if (key === 'TIER_4') return 'gold';
  return 'default';
}

export function CertsTab({
  versions,
  selectedVersion,
  onSelectVersion,
  versionUrls,
  certifications,
}: CertsTabProps) {
  const ordered = sortVersions(versions);

  return (
    <QuarkTheme>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Typography.Text type="secondary" className="text-sm">
            Version
          </Typography.Text>
          {versionUrls ? (
            <nav aria-label="Certification version">
              {ordered.map((item) => (
                <a
                  key={item.version}
                  href={versionUrls[item.version]}
                  className="mr-3 text-sm"
                >
                  {item.version}
                </a>
              ))}
            </nav>
          ) : (
            <Select
              aria-label="Version"
              data-testid="certs-version-select"
              value={selectedVersion}
              onChange={(value) => onSelectVersion?.(value)}
              options={ordered.map((item) => ({
                value: item.version,
                label: item.version,
              }))}
              style={{ minWidth: 160 }}
            />
          )}
        </div>

        {certifications.length === 0 ? (
          <Typography.Text
            type="secondary"
            data-testid="certs-empty"
            className="text-sm"
          >
            No certifications for v{selectedVersion || 'latest'}.
          </Typography.Text>
        ) : (
          <List
            data-testid="certs-list"
            bordered
            split
            dataSource={certifications}
            renderItem={(item) => (
              <List.Item className="[&>.ant-list-item-main-wrapper]:!w-full">
                <div
                  className="flex w-full flex-wrap items-center justify-between gap-3"
                  data-testid={`cert-${item.tier}`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-medium">
                      {item.tier}
                    </span>
                    {item.environment === 'local' ? (
                      <Tag color={tierColor(item.tier)}>Local simulation</Tag>
                    ) : null}
                    <Tag color={statusColor(item.status)}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Tag>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    {item.approvedAt ? (
                      <span>{formatDate(item.approvedAt)}</span>
                    ) : null}
                    {item.reportUrl ? (
                      <a
                        href={item.reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 underline underline-offset-4 hover:text-sky-300"
                      >
                        Report
                      </a>
                    ) : null}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </QuarkTheme>
  );
}

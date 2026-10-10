import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { sortVersions, type PackageVersion } from '../../index';
import { Listy, Tag, Typography, List } from 'antd';
import { useState } from 'react';

import type {
  Certification,
  CertificationTier,
} from '@quarks.studio/certification';
import {
  QuarkTheme,
  TIER_META,
  TIER_ORDER,
  type TierColor,
} from '@quarks.studio/web-ui';

function tierColor(tier?: string): TierColor {
  const key = (tier ?? '').toUpperCase() as CertificationTier;
  return TIER_META[key]?.color ?? 'default';
}

function checkTextColor(tier?: string): string {
  const key = (tier ?? '').toUpperCase() as CertificationTier;
  const color = TIER_META[key]?.color;
  if (color === 'blue') return 'text-blue-600';
  if (color === 'green') return 'text-emerald-600';
  if (color === 'gold') return 'text-amber-600';
  return 'text-slate-600';
}

function visibleCertifications(certifications: Certification[] | undefined) {
  return (certifications ?? [])
    .filter((cert) => cert.status === 'approved' || cert.status === 'rejected')
    .sort(
      (first, second) =>
        TIER_ORDER.indexOf(first.tier) - TIER_ORDER.indexOf(second.tier),
    );
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

interface ExpandedSelection {
  version: string;
  tier: string;
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
  const [expanded, setExpanded] = useState<ExpandedSelection | null>(null);

  if (ordered.length === 0) {
    return (
      <QuarkTheme>
        <Typography.Text type="secondary">
          No published versions for {packageName}.
        </Typography.Text>
      </QuarkTheme>
    );
  }

  const toggle = (version: string, tier: string) => {
    setExpanded((current) =>
      current?.version === version && current.tier === tier
        ? null
        : { version, tier },
    );
  };

  return (
    <QuarkTheme>
      <List
        data-testid="versions-list"
        bordered
        split
        dataSource={ordered}
        renderItem={(item) => {
          const selected = item.version === selectedVersion;
          const certifications = visibleCertifications(item.certifications);
          const open = certifications.find(
            (cert) =>
              expanded?.version === item.version && cert.tier === expanded.tier,
          );
          return (
            <List.Item className={selected ? '!bg-container' : undefined}>
              <div
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-2"
                data-testid={`version-${item.version}`}
              >
                <a
                  href={versionUrls?.[item.version]}
                  data-testid={`select-${item.version}`}
                  aria-pressed={selected}
                  onClick={() => onSelectVersion?.(item.version)}
                  className="order-1 font-mono !text-sm !font-medium"
                >
                  {item.version}
                </a>
                <div
                  className="order-3 flex w-full flex-wrap items-center gap-2 md:order-2 md:w-auto"
                  data-testid={`tiers-${item.version}`}
                >
                  {certifications.length === 0 ? (
                    <Tag color="default" className="!text-slate-400">
                      Uncertified
                    </Tag>
                  ) : (
                    certifications.map((cert) => {
                      const passed = cert.status === 'approved';
                      const active =
                        open !== undefined && open.tier === cert.tier;
                      return (
                        <Tag
                          key={cert.tier}
                          color={passed ? tierColor(cert.tier) : 'default'}
                          className={
                            ( passed
                              ? 'cursor-pointer !select-none'
                              : 'cursor-pointer !select-none !text-slate-400' ) +
                                (active ? ' expanded' : '')
                          }
                          role="button"
                          tabIndex={0}
                          aria-pressed={active}
                          aria-label={`${cert.tier} ${
                            passed ? 'approved' : 'failed'
                          }${active ? ', expanded' : ''}`}
                          onClick={() => toggle(item.version, cert.tier)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              toggle(item.version, cert.tier);
                            }
                          }}
                          data-testid={`tier-${item.version}-${cert.tier}`}
                        >
                          {cert.tier}
                        </Tag>
                      );
                    })
                  )}
                </div>
                <div className="order-2 flex items-center gap-4 md:order-3 md:ml-auto">
                  {open?.logUrl && (
                    <a
                      href={open.logUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`logs-${item.version}-${open.tier}`}
                      className="text-sm text-sky-400 underline underline-offset-4 hover:text-sky-300"
                    >
                      <FileTextOutlined aria-hidden="true" className="mr-1" />
                      Logs
                    </a>
                  )}
                  <a
                    href={downloadUrls?.[item.version]}
                    aria-label={`Download version ${item.version}`}
                    onClick={() => onDownload?.(item.version)}
                    className="text-sm text-sky-400 underline underline-offset-4 hover:text-sky-300"
                  >
                    <DownloadOutlined aria-hidden="true" className="mr-1" />
                    Download
                  </a>
                </div>
                {open && (
                  <div
                    className="order-4 w-full rounded-r border-l-2 border-slate-200 bg-slate-100/60 px-4 py-2"
                    data-testid={`checks-${item.version}-${open.tier}`}
                  >
                    {(open.checks?.length ?? 0) === 0 ? (
                      <div
                        className="space-y-1"
                        data-testid={`check-empty-${item.version}-${open.tier}`}
                      >
                        {open.checks ? (
                          <p className="font-mono text-sm text-slate-400">
                            [ ] No checks recorded
                          </p>
                        ) : (
                          <p className="font-mono text-sm text-slate-400">
                            [ ] Results unavailable
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {open.checks?.map((check, index) => (
                          <div
                            key={`${check.name}-${index}`}
                            className="flex items-center gap-2 font-mono text-sm"
                            data-testid={`check-${item.version}-${open.tier}-${index}`}
                          >
                            <span
                              className={
                                check.passed
                                  ? checkTextColor(open.tier)
                                  : 'text-slate-400'
                              }
                            >
                              {check.passed ? '[PASS]' : '[FAIL]'}
                            </span>
                            <span className="text-slate-600">{check.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </List.Item>
          );
        }}
      />
    </QuarkTheme>
  );
}

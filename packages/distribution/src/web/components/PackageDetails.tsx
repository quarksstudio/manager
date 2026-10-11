import {
  selectPackageVersion,
  type PackageDetails as Detail,
} from '../../index';
import { certificationBadge } from '../lib/certification';
import { QuarkTheme } from '@quarks.studio/web-ui';
import { PackageHeader } from './PackageHeader';
import type { ReactNode } from 'react';
import { PackageSidebar } from './PackageSidebar';
import { PackageTabs } from './PackageTabs';
import { PackageDetailsSkeleton } from './PackageDetailsSkeleton';

export interface PackageDetailsProps {
  packageName: string;
  detail?: Detail | null;
  selectedVersion?: string;
  loading?: boolean;
  error?: string;
  notFound?: boolean;
  urls: {
    retry: string;
    versions: Record<string, string>;
    downloads: Record<string, string>;
  };
  commercialPanel?: ReactNode;
}
export function PackageDetails({
  packageName,
  detail,
  selectedVersion = '',
  loading,
  error,
  notFound,
  urls,
  commercialPanel,
}: PackageDetailsProps) {
  if (loading) return <PackageDetailsSkeleton />;
  const latest = detail?.latestVersion;
  const selected = detail
    ? selectPackageVersion(detail, selectedVersion)
    : null;
  const version = selected?.version ?? null;
  const versionMissing =
    !!selectedVersion && !!detail?.versions.length && !selected;
  const notice = notFound
    ? 'Package not found'
    : error
      ? error
      : !detail
        ? 'No package data'
        : !detail.versions?.length
          ? 'No published versions'
          : versionMissing
            ? 'Version not found'
            : '';
  return (
    <QuarkTheme>
      <main
        className="mx-auto w-full max-w-6xl px-4 py-8"
        data-testid="package-details"
      >
        <PackageHeader
          name={packageName}
          summary={detail?.summary}
          badge={certificationBadge(selected?.certifications)}
        />
        {notice ? (
          <section className="py-8">
            <h2>{notice}</h2>
            <a href={urls.retry}>Retry</a>
            {versionMissing && latest && (
              <a href={urls.versions[latest]}>See latest version ({latest})</a>
            )}
          </section>
        ) : (
          detail && (
            <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-6 lg:order-2">
                <PackageSidebar
                  packageName={packageName}
                  version={version}
                  downloads={detail.stats?.downloads}
                  downloadsSince={detail.stats?.series[0]?.time}
                  authors={detail.authors}
                  tags={detail.tags}
                  installCommand={
                    version
                      ? `quark install ${packageName}@${version}`
                      : `quark install ${packageName}`
                  }
                />
                {commercialPanel}
              </div>
              <div className="lg:order-1">
                <PackageTabs
                  packageName={packageName}
                  detail={detail}
                  selectedVersion={version ?? ''}
                  urls={urls}
                />
              </div>
            </div>
          )
        )}
      </main>
    </QuarkTheme>
  );
}

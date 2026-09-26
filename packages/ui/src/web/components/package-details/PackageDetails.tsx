import {
  highestVersion,
  type PackageDetails as Detail,
} from '@quarks.studio/registry/client';
import { certificationBadge } from '../../lib/certification';
import { QuarkTheme } from '../../lib/theme';
import { PackageHeader } from './PackageHeader';
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
  readme?: { content: string; error?: string };
  urls: {
    retry: string;
    versions: Record<string, string>;
    downloads: Record<string, string>;
    metadata?: string;
  };
  formError?: string;
  draft?: { description: string; tags: string; authors: string };
}
export function PackageDetails({
  packageName,
  detail,
  selectedVersion = '',
  loading,
  error,
  notFound,
  readme,
  urls,
  formError,
  draft,
}: PackageDetailsProps) {
  if (loading) return <PackageDetailsSkeleton />;
  const latest = highestVersion(detail?.versions)?.version;
  const versionMissing =
    !!selectedVersion &&
    !(detail?.versions ?? []).some((v) => v.version === selectedVersion);
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
          description={detail?.description}
          badge={certificationBadge(
            highestVersion(detail?.versions)?.certifications,
          )}
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
              <PackageTabs
                packageName={packageName}
                detail={detail}
                selectedVersion={selectedVersion}
                readme={{
                  content: readme?.content ?? '',
                  error: readme?.error,
                  loading: false,
                  version: selectedVersion,
                  retryUrl: urls.retry,
                }}
                urls={urls}
                formError={formError}
                draft={draft}
              />
              <PackageSidebar
                packageName={packageName}
                latestVersion={latest ?? null}
                downloads={detail.downloads}
                downloadsSince={detail.downloadsSince}
                authors={detail.authors}
                tags={detail.tags}
                installCommand={`quark add ${packageName}`}
              />
            </div>
          )
        )}
      </main>
    </QuarkTheme>
  );
}

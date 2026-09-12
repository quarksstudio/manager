import { PackageSearch } from 'lucide-react';

import { usePackageDetailsView } from '../../../hooks/usePackageDetailsView';
import { useReadmeCached } from '../../../hooks/useReadmeCached';
import { usePackageDownload } from '../../../hooks/usePackageDownload';
import { PackageHeader } from './PackageHeader';
import { PackageTabs } from './PackageTabs';
import { PackageSidebar } from './PackageSidebar';
import { PackageStateNotice } from './PackageStateNotice';
import { PackageDetailsSkeleton } from './PackageDetailsSkeleton';
import { Button } from '../ui/button';

export interface PackageDetailsProps {
  packageName: string;
  initialVersion?: string;
  onVersionChange?: (version: string) => void;
}

export function PackageDetails({
  packageName,
  initialVersion,
  onVersionChange,
}: PackageDetailsProps) {
  const view = usePackageDetailsView(packageName, {
    initialVersion,
    onVersionChange,
  });
  const { download } = usePackageDownload(packageName);
  const {
    data: readme,
    error: readmeError,
    loading: readmeLoading,
    refetch: refetchReadme,
  } = useReadmeCached(packageName, view.selectedVersion || undefined);

  if (view.loading) {
    return <PackageDetailsSkeleton />;
  }

  if (view.notFound) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <PackageStateNotice
          title="Package not found"
          description={`No package named "${packageName}" exists in the registry.`}
          onRetry={view.refetch}
        >
          <PackageSearch
            aria-hidden="true"
            className="size-6 text-muted-foreground"
          />
        </PackageStateNotice>
      </div>
    );
  }

  if (view.error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <PackageStateNotice
          title="Something went wrong"
          description={
            view.error instanceof Error
              ? view.error.message
              : String(view.error)
          }
          onRetry={view.refetch}
        />
      </div>
    );
  }

  if (!view.detail) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <PackageStateNotice
          title="No package data"
          description={`Could not load details for "${packageName}".`}
          onRetry={view.refetch}
        />
      </div>
    );
  }

  const { detail } = view;
  const installCommand = `quark add ${packageName}`;
  const empty = (detail.versions ?? []).length === 0;

  if (empty) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-8">
        <PackageHeader
          name={view.packageName}
          badge={view.badge}
          description={detail.description}
        />
        <PackageStateNotice
          title="No published versions"
          description={`${packageName} has not published any versions yet.`}
          onRetry={view.refetch}
        />
      </div>
    );
  }

  if (view.versionNotFound) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-8">
        <PackageHeader
          name={view.packageName}
          badge={view.badge}
          description={detail.description}
        />
        <PackageStateNotice
          title="Version not found"
          description={`Version "${view.requestedVersion}" does not exist for "${packageName}".`}
          onRetry={view.refetch}
        >
          {onVersionChange && view.latestVersion ? (
            <Button
              variant="outline"
              data-testid="see-latest-version"
              onClick={() => onVersionChange(view.latestVersion as string)}
            >
              See latest version ({view.latestVersion})
            </Button>
          ) : null}
        </PackageStateNotice>
      </div>
    );
  }

  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 py-8"
      data-testid="package-details"
    >
      <PackageHeader
        name={view.packageName}
        badge={view.badge}
        description={detail.description}
      />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <PackageTabs
          packageName={packageName}
          detail={detail}
          selectedVersion={view.selectedVersion}
          onSelectVersion={view.setSelectedVersion}
          onDownload={(version) => void download(version)}
          readme={{
            loading: readmeLoading,
            error: readmeError,
            content: readme?.content ?? '',
            version: view.selectedVersion,
            onRetry: refetchReadme,
          }}
          onDetailRefetch={view.refetch}
        />
        <PackageSidebar
          packageName={packageName}
          latestVersion={view.latestVersion}
          downloads={detail.downloads}
          downloadsSince={detail.downloadsSince}
          authors={detail.authors}
          tags={detail.tags}
          installCommand={installCommand}
        />
      </div>
    </main>
  );
}

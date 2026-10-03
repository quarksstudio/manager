import { useMemo } from 'react';
import {
  PackagesBoundary as PackagesView,
  PackageDetails as DetailsView,
  type PackageDetailsProps as DetailsViewProps,
} from './views';
import {
  PackagePlansPanel,
  type PackagePlansPanelProps,
} from '@quarks.studio/commerce/web';
import { DistributionWebProvider } from './services';
import { useDistributionClient } from '../hooks/useDistributionClient';
export function packageUrl(name: string, version?: string) {
  return `/packages/${encodeURIComponent(name)}${version ? `/${encodeURIComponent(version)}` : ''}`;
}
function downloadUrl(name: string, version: string) {
  return `${packageUrl(name, version)}/download`;
}
function navigate(url: string) {
  window.location.replace(url);
}
export interface PackagesBoundaryProps {
  apiBaseUrl: string;
  packageName: string;
  version?: string;
}
export function ConfiguredPackagesBoundary({
  apiBaseUrl,
  ...props
}: PackagesBoundaryProps) {
  const client = useDistributionClient(apiBaseUrl);
  const services = useMemo(
    () => ({
      get: (name: string) => client.get(name),
      getReadme: (name: string, version: string) =>
        client.getReadme(name, version),
    }),
    [client],
  );
  return (
    <DistributionWebProvider services={services}>
      <PackagesView
        {...props}
        packageUrl={packageUrl}
        downloadUrl={downloadUrl}
        navigate={navigate}
      />
    </DistributionWebProvider>
  );
}
export interface ConfiguredPackageDetailsProps extends DetailsViewProps {
  plans?: Omit<PackagePlansPanelProps, 'packageName'>;
}
export function ConfiguredPackageDetails({
  plans,
  commercialPanel,
  ...props
}: ConfiguredPackageDetailsProps) {
  return (
    <DetailsView
      {...props}
      commercialPanel={
        commercialPanel ??
        (plans ? (
          <PackagePlansPanel packageName={props.packageName} {...plans} />
        ) : undefined)
      }
    />
  );
}

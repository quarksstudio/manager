import { useMemo } from 'react';
import { PackagesBoundary as PackagesView } from '../containers/PackagesBoundary';
import { DistributionWebProvider } from '../../presentation/web-services';
import { DistributionProvider } from '../../presentation/services';
import { createDistributionServices } from '../../presentation/configured-services';
import { useDistributionClient } from '../../hooks/useDistributionClient';
import { packageUrl, downloadUrl, navigate } from '../lib/package-links';

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
  // The configuration tab issues its own writes against the registry.
  const distributionServices = useMemo(() => createDistributionServices(), []);
  return (
    <DistributionProvider services={distributionServices}>
      <DistributionWebProvider services={services}>
        <PackagesView
          {...props}
          packageUrl={packageUrl}
          downloadUrl={downloadUrl}
          navigate={navigate}
        />
      </DistributionWebProvider>
    </DistributionProvider>
  );
}

import { useMemo } from 'react';
import type { PackageDetails } from '../../domain/package-details';
import { PackagesBoundary as PackagesView } from '../containers/PackagesBoundary';
import { DistributionWebProvider } from '../../presentation/web-services';
import { DistributionProvider } from '../../presentation/services';
import { createDistributionServices } from '../../presentation/configured-services';
import { useDistributionClient } from '../../hooks/useDistributionClient';
import { packageUrl, downloadUrl } from '../lib/package-links';

export interface PackagesBoundaryProps {
  apiBaseUrl: string;
  packageName: string;
  version?: string;
  initialDetail?: PackageDetails;
}

export function ConfiguredPackagesBoundary({
  apiBaseUrl,
  ...props
}: PackagesBoundaryProps) {
  const client = useDistributionClient(apiBaseUrl);
  const services = useMemo(
    () => ({
      get: (name: string) => client.get(name),
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
        />
      </DistributionWebProvider>
    </DistributionProvider>
  );
}

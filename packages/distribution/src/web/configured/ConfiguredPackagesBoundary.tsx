import { useMemo } from 'react';
import { PackagesBoundary } from '../containers/PackagesBoundary';
import { DistributionWebProvider } from '../../presentation/web-services';
import { DistributionProvider } from '../../presentation/services';
import { createDistributionServices } from '../../presentation/configured-services';
import { useDistributionClient } from '../../hooks/useDistributionClient';
import { packageUrl, downloadUrl } from '../lib/package-links';

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
    }),
    [client],
  );
  // The configuration tab issues its own writes against the registry.
  const distributionServices = useMemo(() => createDistributionServices(), []);
  return (
    <DistributionProvider services={distributionServices}>
      <DistributionWebProvider services={services}>
        <PackagesBoundary
          {...props}
          packageUrl={packageUrl}
          downloadUrl={downloadUrl}
        />
      </DistributionWebProvider>
    </DistributionProvider>
  );
}

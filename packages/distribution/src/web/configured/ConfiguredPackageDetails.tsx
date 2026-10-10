import { useMemo } from 'react';
import {
  PackageDetails as DetailsView,
  type PackageDetailsProps as DetailsViewProps,
} from '../components/PackageDetails';
import {
  DistributionProvider,
  type DistributionServices,
} from '../../presentation/services';
import { createDistributionServices } from '../../presentation/configured-services';
import {
  PackagePlansPanel,
  type PackagePlansPanelProps,
} from '@quarks.studio/commerce/web';

export interface ConfiguredPackageDetailsProps extends DetailsViewProps {
  plans?: Omit<PackagePlansPanelProps, 'packageName'>;
}

/** The package page wired to the registry: metadata edits stay in the browser. */
export function ConfiguredPackageDetails({
  plans,
  commercialPanel,
  ...props
}: ConfiguredPackageDetailsProps) {
  const services: DistributionServices = useMemo(
    () => createDistributionServices(),
    [],
  );
  return (
    <DistributionProvider services={services}>
      <DetailsView
        {...props}
        commercialPanel={
          commercialPanel ??
          (plans ? (
            <PackagePlansPanel packageName={props.packageName} {...plans} />
          ) : undefined)
        }
      />
    </DistributionProvider>
  );
}

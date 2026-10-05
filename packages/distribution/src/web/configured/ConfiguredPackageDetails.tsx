import {
  PackageDetails as DetailsView,
  type PackageDetailsProps as DetailsViewProps,
} from '../components/PackageDetails';
import {
  PackagePlansPanel,
  type PackagePlansPanelProps,
} from '@quarks.studio/commerce/web';

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

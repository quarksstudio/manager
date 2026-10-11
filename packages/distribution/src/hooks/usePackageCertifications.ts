import {
  certificationsForVersion,
  selectPackageVersion,
  type PackageDetails,
} from '../domain/package-details';
import {
  type DistributionServices,
  type UsePackageCertificationsReturn,
} from '../presentation/services';
import { useFetchPackage } from './useFetchPackage';
export function usePackageCertifications(
  name: string,
  version?: string,
  override?: DistributionServices,
): UsePackageCertificationsReturn {
  const {
    data: detail,
    loading,
    error,
    refetch,
  } = useFetchPackage<PackageDetails>(name, override);
  const versions = detail?.versions ?? [];
  const target = detail
    ? selectPackageVersion(detail, version)?.version
    : undefined;
  return {
    data: target ? certificationsForVersion(detail, target) : null,
    versions,
    latestVersion: detail?.latestVersion ?? undefined,
    loading,
    error,
    refetch,
  };
}

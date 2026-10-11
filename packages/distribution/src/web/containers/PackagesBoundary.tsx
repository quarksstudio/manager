import { useEffect, useState } from 'react';
import { RegistryHttpError } from '@quarks.studio/registry/http';
import { useDistributionWebServices } from '../../hooks/useDistributionWebServices';
import { type PackageDetails as Detail } from '../../index';
import { PackageDetails } from '../components/PackageDetails';

function detailUrls(
  name: string,
  version: string | undefined,
  detail: Detail | null,
  packageUrl: (name: string, version?: string) => string,
  downloadUrl: (name: string, version: string) => string,
) {
  return {
    retry: packageUrl(name, version),
    versions: Object.fromEntries(
      (detail?.versions ?? []).map((item) => [
        item.version,
        packageUrl(name, item.version),
      ]),
    ),
    downloads: Object.fromEntries(
      (detail?.versions ?? []).map((item) => [
        item.version,
        downloadUrl(name, item.version),
      ]),
    ),
  };
}

export interface PackagesBoundaryProps {
  packageName: string;
  version?: string;
  initialDetail?: Detail;
  packageUrl: (name: string, version?: string) => string;
  downloadUrl: (name: string, version: string) => string;
}

export function PackagesBoundary({
  packageName,
  version,
  packageUrl,
  downloadUrl,
  initialDetail,
}: PackagesBoundaryProps) {
  const services = useDistributionWebServices();
  const [state, setState] = useState<{
    detail: Detail | null;
    loading: boolean;
    error?: string;
    notFound: boolean;
  }>({
    detail: initialDetail ?? null,
    loading: !initialDetail,
    notFound: false,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data =
          initialDetail?.name === packageName
            ? initialDetail
            : await services.get(packageName);
        if (cancelled) return;
        if (!cancelled)
          setState({ detail: data, loading: false, notFound: false });
      } catch (failure) {
        if (cancelled) return;
        const status =
          failure instanceof RegistryHttpError ? failure.status : undefined;
        setState({
          detail: null,
          loading: false,
          notFound: status === 404,
          error: status === 404 ? undefined : 'Could not load package.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packageName, version, services, initialDetail]);

  return (
    <PackageDetails
      packageName={packageName}
      detail={state.detail}
      selectedVersion={version}
      loading={state.loading}
      error={state.error}
      notFound={state.notFound}
      urls={detailUrls(
        packageName,
        version,
        state.detail,
        packageUrl,
        downloadUrl,
      )}
    />
  );
}

export default PackagesBoundary;

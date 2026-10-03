import { useEffect, useState } from 'react';
import { RegistryHttpError } from '@quarks.studio/registry/http';
import { useDistributionWebServices } from './services';
import { highestVersion, type PackageDetails as Detail } from '../index';
import { PackageDetails } from './components/package-details/PackageDetails';

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
  packageUrl: (name: string, version?: string) => string;
  downloadUrl: (name: string, version: string) => string;
  navigate: (url: string) => void;
}

export function PackagesBoundary({
  packageName,
  version,
  packageUrl,
  downloadUrl,
  navigate,
}: PackagesBoundaryProps) {
  const services = useDistributionWebServices();
  const [state, setState] = useState<{
    detail: Detail | null;
    readme: { content: string; error?: string };
    loading: boolean;
    error?: string;
    notFound: boolean;
  }>({ detail: null, readme: { content: '' }, loading: true, notFound: false });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await services.get(packageName);
        if (cancelled) return;
        const available = data.versions ?? [];
        const latest = highestVersion(available)?.version;
        const target = version ?? latest;
        if (!version && target) {
          navigate(packageUrl(packageName, target));
          return;
        }
        if (target && !available.some((item) => item.version === target)) {
          if (!cancelled)
            setState({
              detail: data,
              readme: { content: '' },
              loading: false,
              notFound: true,
            });
          return;
        }
        let readme: { content: string; error?: string } = { content: '' };
        if (target) {
          try {
            readme = {
              content: (await services.getReadme(packageName, target)).content,
            };
          } catch {
            readme = { content: '', error: 'README unavailable' };
          }
        }
        if (!cancelled)
          setState({ detail: data, readme, loading: false, notFound: false });
      } catch (failure) {
        if (cancelled) return;
        const status =
          failure instanceof RegistryHttpError ? failure.status : undefined;
        setState({
          detail: null,
          readme: { content: '' },
          loading: false,
          notFound: status === 404,
          error: status === 404 ? undefined : 'Could not load package.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packageName, version, services, packageUrl, navigate]);

  return (
    <PackageDetails
      packageName={packageName}
      detail={state.detail}
      selectedVersion={version}
      loading={state.loading}
      error={state.error}
      notFound={state.notFound}
      readme={state.readme}
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

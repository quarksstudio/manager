import { useEffect, useState } from 'react';
import {
  createRegistryClient,
  highestVersion,
  RegistryHttpError,
  type PackageDetails as Detail,
} from '@quarks.studio/registry/client';
import { PackageDetails } from '@quarks.studio/ui/web';

const registryBaseUrl =
  (import.meta.env.PUBLIC_REGISTRY_API_URL as string | undefined) ??
  'http://localhost:8081/v1';

function encode(value: string) {
  return encodeURIComponent(value);
}

function packageUrl(name: string, version?: string) {
  return `/packages/${encode(name)}${version ? `/${encode(version)}` : ''}`;
}

function detailUrls(
  name: string,
  version: string | undefined,
  detail: Detail | null,
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
        `${packageUrl(name, item.version)}/download`,
      ]),
    ),
  };
}

export interface PackagesBoundaryProps {
  packageName: string;
  version?: string;
}

export function PackagesBoundary({
  packageName,
  version,
}: PackagesBoundaryProps) {
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
      const client = createRegistryClient({ baseUrl: registryBaseUrl });
      try {
        const data = await client.Packages.get(packageName);
        if (cancelled) return;
        const available = data.versions ?? [];
        const latest = highestVersion(available)?.version;
        const target = version ?? latest;
        if (!version && target) {
          window.location.replace(packageUrl(packageName, target));
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
              content: (await client.Packages.getReadme(packageName, target))
                .content,
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
  }, [packageName, version]);

  return (
    <PackageDetails
      packageName={packageName}
      detail={state.detail}
      selectedVersion={version}
      loading={state.loading}
      error={state.error}
      notFound={state.notFound}
      readme={state.readme}
      urls={detailUrls(packageName, version, state.detail)}
    />
  );
}

export default PackagesBoundary;

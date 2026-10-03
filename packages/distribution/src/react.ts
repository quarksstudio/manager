import {
  createContext,
  createElement,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import {
  useRegistryQuery,
  type RegistryQuery,
} from '@quarks.studio/use-storage/query';
import {
  certificationsForVersion,
  highestVersion,
  type Certification,
  type PackageDetails,
  type PackageReadme,
  type PackageVersion,
  type UpdatePackageMetadataInput,
} from './domain/package-details';
export interface DistributionServices {
  get(name: string): Promise<unknown>;
  getReadme(name: string, version: string): Promise<PackageReadme>;
  update(
    body: { id: string; [key: string]: unknown },
    isNew?: boolean,
  ): Promise<unknown>;
}

const ServicesContext = createContext<DistributionServices | null>(null);
export function DistributionProvider({
  services,
  children,
}: {
  services: DistributionServices;
  children: ReactNode;
}) {
  return createElement(ServicesContext.Provider, { value: services }, children);
}
function useServices(override?: DistributionServices): DistributionServices {
  const services = useContext(ServicesContext);
  if (override) return override;
  if (!services) throw new Error('DistributionProvider is required');
  return services;
}
export function useFetchPackage<T = Record<string, unknown>>(
  name: string,
  override?: DistributionServices,
): RegistryQuery<T> {
  const client = useServices(override);
  const load = useCallback(
    async () => (await client.get(name)) as T,
    [client, name],
  );
  return useRegistryQuery(load, !!name);
}

export function usePackageReadme(
  name: string,
  version?: string,
  override?: DistributionServices,
): RegistryQuery<PackageReadme> {
  const client = useServices(override);
  const load = useCallback(
    () => client.getReadme(name, version as string),
    [client, name, version],
  );
  return useRegistryQuery(load, !!name && !!version);
}

export type UsePackageCertificationsReturn = {
  data: Certification[] | null;
  versions: PackageVersion[];
  latestVersion?: string;
  loading: boolean;
  error: unknown;
  refetch: () => void;
};

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
  const target = version ?? highestVersion(versions)?.version;
  return {
    data: target ? certificationsForVersion(detail, target) : null,
    versions,
    latestVersion: highestVersion(versions)?.version,
    loading,
    error,
    refetch,
  };
}

export interface UseUpdatePackageMetadataReturn {
  save: (input: UpdatePackageMetadataInput) => Promise<void>;
  status: 'idle' | 'saving' | 'success' | 'error';
  error: Error | null;
  reset: () => void;
}

export function useUpdatePackageMetadata(
  override?: DistributionServices,
): UseUpdatePackageMetadataReturn {
  const client = useServices(override);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<Error | null>(null);

  const save = useCallback(
    async (input: UpdatePackageMetadataInput) => {
      setStatus('saving');
      setError(null);
      try {
        await client.update({
          id: input.id,
          description: input.description,
          tags: input.tags,
          authors: input.authors,
        });
        setStatus('success');
      } catch (reason) {
        const failure =
          reason instanceof Error ? reason : new Error(String(reason));
        setError(failure);
        setStatus('error');
        throw failure;
      }
    },
    [client],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { save, status, error, reset };
}

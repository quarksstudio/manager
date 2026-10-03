import { useCallback, useState } from 'react';
import { type UpdatePackageMetadataInput } from '../domain/package-details';
import {
  type DistributionServices,
  type UseUpdatePackageMetadataReturn,
} from '../presentation/services';
import { useDistributionServices } from './useDistributionServices';
export function useUpdatePackageMetadata(
  override?: DistributionServices,
): UseUpdatePackageMetadataReturn {
  const client = useDistributionServices(override);
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

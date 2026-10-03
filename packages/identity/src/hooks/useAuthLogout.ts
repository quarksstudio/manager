import { useCallback, useState } from 'react';
import { type IdentityServices } from '../presentation/services';
import { useServices } from './useServices';
export function useAuthLogout(override?: IdentityServices) {
  const client = useServices(override);
  const [status, setStatus] = useState<
    'idle' | 'running' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState<Error | null>(null);
  const logout = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      await client.logout();
      await client.clearSession();
      setStatus('success');
    } catch (reason) {
      const failure =
        reason instanceof Error ? reason : new Error(String(reason));
      setError(failure);
      setStatus('error');
      throw failure;
    }
  }, [client]);
  return { logout, status, error };
}

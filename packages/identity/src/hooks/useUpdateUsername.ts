import { useEffect, useRef, useState } from 'react';
import type { UserProfileServices } from '../application/user-profile.port';

export function useUpdateUsername(
  services: UserProfileServices,
  onUpdated: (username: string) => void,
) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function save(username: string) {
    if (busy.current) return;
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,30}$/.test(normalized)) {
      setError('Use 3–30 letters, numbers, underscores or hyphens.');
      return;
    }
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      const profile = await services.updateUsername(normalized);
      if (mounted.current) onUpdated(profile.username);
    } catch (failure) {
      if (!mounted.current) return;
      const status =
        typeof failure === 'object' && failure !== null && 'status' in failure
          ? failure.status
          : undefined;
      setError(
        status === 409
          ? 'Username is already taken.'
          : status === 400
            ? 'Invalid username.'
            : 'Could not save username. Please try again.',
      );
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  return { save, saving, error };
}

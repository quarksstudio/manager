import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  UserSettings,
  UserSettingsServices,
  UserSettingsChanges,
} from '../application/user-settings.port';
export function useUserSettings(
  services: UserSettingsServices,
  enabled: boolean,
  onSaved: (profile: UserSettings) => void,
) {
  const [profile, setProfile] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const revision = useRef(0);
  const mounted = useRef(false);
  const load = useCallback(async () => {
    if (!enabled) return;
    const request = ++revision.current;
    setLoading(true);
    setError('');
    try {
      const value = await services.get();
      if (mounted.current && request === revision.current) setProfile(value);
    } catch {
      if (mounted.current && request === revision.current)
        setError('Could not load settings. Please try again.');
    } finally {
      if (mounted.current && request === revision.current) setLoading(false);
    }
  }, [enabled, services]);
  useEffect(() => {
    mounted.current = true;
    setProfile(null);
    void load();
    return () => {
      mounted.current = false;
      revision.current += 1;
    };
  }, [load]);
  async function save(changes: UserSettingsChanges) {
    if (!enabled || busy.current || !Object.keys(changes).length) return;
    const request = revision.current;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      const value = await services.update(changes);
      if (mounted.current && request === revision.current) onSaved(value);
    } catch (failure) {
      const status =
        typeof failure === 'object' && failure !== null && 'status' in failure
          ? failure.status
          : undefined;
      if (mounted.current && request === revision.current)
        setError(
          status === 409
            ? 'Username is already taken.'
            : status === 400
              ? 'Invalid profile data.'
              : 'Could not save settings. Please try again.',
        );
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  return { profile, loading, saving, error, load, save };
}

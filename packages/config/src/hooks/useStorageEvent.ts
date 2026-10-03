import { useEffect } from 'react';
import { APP_NAME, AUTH_SESSION_KEY, CONFIG_KEY } from '../lib/store';
export function useStorageEvent(onChange: () => void): void {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const keys = [
      `${APP_NAME}:${AUTH_SESSION_KEY}`,
      `${APP_NAME}:${CONFIG_KEY}`,
    ];
    const listener = (event: StorageEvent) => {
      if (event.key !== null && !keys.includes(event.key)) return;
      onChange();
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, [onChange]);
}

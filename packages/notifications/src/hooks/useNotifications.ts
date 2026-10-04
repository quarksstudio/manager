import { useCallback } from 'react';
import type { NotificationMessage } from '../domain';
import { getBrowserNotificationRuntime } from '../infrastructure';

export function useNotifications() {
  const notify = useCallback(async (message: NotificationMessage) => {
    await getBrowserNotificationRuntime()?.notify(message);
  }, []);
  return { notify };
}

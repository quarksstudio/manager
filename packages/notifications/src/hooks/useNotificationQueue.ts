import { useSyncExternalStore } from 'react';
import {
  getBrowserNotificationRuntime,
  getServerSnapshot,
} from '../infrastructure';

const subscribeServer = () => () => undefined;
const dismissServer = () => undefined;

export function useNotificationQueue() {
  const runtime = getBrowserNotificationRuntime();
  const notifications = useSyncExternalStore(
    runtime?.subscribe ?? subscribeServer,
    runtime?.getSnapshot ?? getServerSnapshot,
    getServerSnapshot,
  );
  return { notifications, dismiss: runtime?.dismiss ?? dismissServer };
}

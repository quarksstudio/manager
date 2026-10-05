import { NotificationViewport, QuarkTheme } from '@quarks.studio/web-ui';
import { useNotificationQueue } from '../../hooks';

export function NotificationHost() {
  const { notifications, dismiss } = useNotificationQueue();
  return (
    <QuarkTheme>
      <NotificationViewport notifications={notifications} onDismiss={dismiss} />
    </QuarkTheme>
  );
}

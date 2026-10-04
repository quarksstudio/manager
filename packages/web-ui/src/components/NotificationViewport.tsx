import { useEffect, useRef } from 'react';
import { notification } from 'antd';

export interface NotificationView {
  id: number;
  level: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export interface NotificationViewportProps {
  notifications: readonly NotificationView[];
  onDismiss(id: number): void;
}

export function NotificationViewport({
  notifications,
  onDismiss,
}: NotificationViewportProps) {
  const [api, contextHolder] = notification.useNotification({
    placement: 'topRight',
    // The shared queue owns expiration, including notices queued before hydration.
    duration: 0,
  });
  const displayed = useRef(new Set<number>());

  useEffect(() => {
    const current = new Set(notifications.map((item) => item.id));
    for (const id of displayed.current) {
      if (!current.has(id)) {
        displayed.current.delete(id);
        api.destroy(id);
      }
    }
    for (const item of notifications) {
      if (displayed.current.has(item.id)) continue;
      displayed.current.add(item.id);
      api[item.level]({
        key: item.id,
        title: item.title,
        description: item.message,
        role: item.level === 'error' ? 'alert' : 'status',
        onClose: () => onDismiss(item.id),
      });
    }
  }, [api, notifications, onDismiss]);

  useEffect(() => {
    const shown = displayed.current;
    return () => {
      shown.clear();
      api.destroy();
    };
  }, [api]);

  return contextHolder;
}

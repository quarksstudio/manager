export type NotificationLevel = 'success' | 'error' | 'info' | 'warning';

export interface NotificationMessage {
  level: NotificationLevel;
  title: string;
  message?: string;
}

export interface VisualNotification extends NotificationMessage {
  id: number;
}

export type NativeDeliveryResult = 'shown' | 'unavailable' | 'failed';

import type { NativeDeliveryResult, NotificationMessage } from '../domain';

export interface NotificationDelivery {
  show(message: NotificationMessage): Promise<NativeDeliveryResult>;
}

export interface NotificationService {
  notify(message: NotificationMessage): Promise<void>;
}

export function createNotificationService(
  visual: (message: NotificationMessage) => void,
  native?: NotificationDelivery,
): NotificationService {
  return {
    async notify(message) {
      if (native) {
        try {
          if ((await native.show(message)) === 'shown') return;
        } catch {
          // Delivery failures use the visual channel.
        }
      }
      try {
        visual(message);
      } catch {
        // A presentation failure must not fail the action being reported.
      }
    },
  };
}

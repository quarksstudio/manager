import {
  createNotificationService,
  type NotificationService,
} from '../application';
import type {
  NotificationMessage,
  VisualNotification,
  NativeDeliveryResult,
} from '../domain';

export interface DesktopNotificationBridge {
  notifications: {
    show(message: NotificationMessage): Promise<NativeDeliveryResult>;
  };
}

export interface BrowserNotificationRuntime extends NotificationService {
  subscribe(listener: () => void): () => void;
  getSnapshot(): readonly VisualNotification[];
  dismiss(id: number): void;
}

const empty: readonly VisualNotification[] = [];
export const getServerSnapshot = () => empty;
const runtimeKey = Symbol.for('quarks.notifications.runtime');
type NotificationWindow = Window & {
  quarkDesktop?: DesktopNotificationBridge;
  [runtimeKey]?: BrowserNotificationRuntime;
};

export function createBrowserNotificationRuntime(
  bridge?: DesktopNotificationBridge,
): BrowserNotificationRuntime {
  let items: readonly VisualNotification[] = [];
  let nextId = 0;
  const listeners = new Set<() => void>();
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  const emit = () => listeners.forEach((listener) => listener());
  const dismiss = (id: number) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
    items = items.filter((item) => item.id !== id);
    emit();
  };
  const startTimers = () => {
    if (!listeners.size) return;
    for (const item of items) {
      if (item.level !== 'error' && !timers.has(item.id))
        timers.set(
          item.id,
          setTimeout(() => dismiss(item.id), 5000),
        );
    }
  };
  const service = createNotificationService((message) => {
    items = [...items, { ...message, id: ++nextId }];
    startTimers();
    emit();
  }, bridge?.notifications);
  return {
    ...service,
    getSnapshot: () => items,
    dismiss,
    subscribe(listener) {
      listeners.add(listener);
      startTimers();
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          timers.forEach(clearTimeout);
          timers.clear();
        }
      };
    },
  };
}

export function getBrowserNotificationRuntime():
  BrowserNotificationRuntime | undefined {
  if (typeof window === 'undefined') return undefined;
  const browser = window as NotificationWindow;
  return (browser[runtimeKey] ??= createBrowserNotificationRuntime(
    browser.quarkDesktop,
  ));
}

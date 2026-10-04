import { createNotificationService } from '../src/application';
import {
  createBrowserNotificationRuntime,
  getBrowserNotificationRuntime,
  getServerSnapshot,
} from '../src/infrastructure';
import { act, renderHook } from '@testing-library/react';
import { useNotifications, useNotificationQueue } from '../src/hooks';

const message = { level: 'success' as const, title: 'Sesión iniciada' };

afterEach(() => jest.useRealTimers());

it.each(['unavailable', 'failed', 'rejected'])(
  'falls back for %s',
  async (result) => {
    const visual = jest.fn();
    const show = jest.fn(() =>
      result === 'rejected'
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(result as 'failed' | 'unavailable'),
    );
    await createNotificationService(visual, { show }).notify(message);
    expect(visual).toHaveBeenCalledTimes(1);
    expect(visual).toHaveBeenCalledWith(message);
  },
);

it('uses only native delivery when shown', async () => {
  const visual = jest.fn();
  await createNotificationService(visual, { show: async () => 'shown' }).notify(
    message,
  );
  expect(visual).not.toHaveBeenCalled();
});

it('queues before hydration, expires after presentation, and keeps errors until dismissed', async () => {
  jest.useFakeTimers();
  const runtime = createBrowserNotificationRuntime();
  await runtime.notify(message);
  jest.advanceTimersByTime(10000);
  expect(runtime.getSnapshot()).toHaveLength(1);
  const listener = jest.fn();
  const unsubscribe = runtime.subscribe(listener);
  await runtime.notify({ level: 'error', title: 'Falló' });
  jest.advanceTimersByTime(5000);
  expect(runtime.getSnapshot().map((item) => item.title)).toEqual(['Falló']);
  runtime.dismiss(runtime.getSnapshot()[0].id);
  expect(runtime.getSnapshot()).toHaveLength(0);
  unsubscribe();
});

it('shares the runtime across independent React roots and has an empty server snapshot', async () => {
  const producer = renderHook(() => useNotifications());
  const consumer = renderHook(() => useNotificationQueue());
  await act(async () => producer.result.current.notify(message));
  expect(consumer.result.current.notifications).toHaveLength(1);
  expect(getServerSnapshot()).toEqual([]);
  expect(getBrowserNotificationRuntime()).toBe(getBrowserNotificationRuntime());
  act(() =>
    consumer.result.current.dismiss(
      consumer.result.current.notifications[0].id,
    ),
  );
  consumer.unmount();
  producer.unmount();
});

it('does not reject the action when its visual presenter fails', async () => {
  await expect(
    createNotificationService(() => {
      throw new Error('UI unavailable');
    }).notify(message),
  ).resolves.toBeUndefined();
});

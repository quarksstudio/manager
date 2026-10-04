/** @jest-environment node */
import {
  getBrowserNotificationRuntime,
  getServerSnapshot,
} from '../src/infrastructure';

it('never creates notification state on the server', () => {
  expect(getBrowserNotificationRuntime()).toBeUndefined();
  expect(getServerSnapshot()).toEqual([]);
  expect(getServerSnapshot()).toBe(getServerSnapshot());
});

/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PaymentPage } from '../../src/domain/payment-history';
import { usePayments, type CommerceServices } from '../../src/react';
const payment = (id: string) => ({
  id,
  kind: 'execution' as const,
  provider: 'paypal',
  executedAt: '2026-09-01T00:00:00Z',
});
it('loads pages, preserves rows after a failure, and retries without duplicates', async () => {
  const listPayments = jest
    .fn()
    .mockResolvedValueOnce({ items: [payment('1')], nextCursor: 'next' })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      items: [payment('1'), payment('2')],
      nextCursor: null,
    });
  const services: CommerceServices = {
    listPayments,
    createPaymentLink: jest.fn(),
  };
  const { result } = renderHook(() => usePayments({}, services));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => result.current.loadMore());
  expect(result.current.error).toBeInstanceOf(Error);
  expect(result.current.data).toEqual([payment('1')]);
  expect(result.current.hasMore).toBe(true);
  await act(async () => result.current.loadMore());
  expect(result.current.data).toEqual([payment('1'), payment('2')]);
  expect(result.current.hasMore).toBe(false);
  expect(result.current.error).toBeNull();
});
it('ignores an old request after changing services', async () => {
  let finish!: (value: PaymentPage) => void;
  const old: CommerceServices = {
    listPayments: jest.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ),
    createPaymentLink: jest.fn(),
  };
  const current: CommerceServices = {
    listPayments: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
    createPaymentLink: jest.fn(),
  };
  const { result, rerender } = renderHook(
    ({ services }) => usePayments({}, services),
    { initialProps: { services: old } },
  );
  rerender({ services: current });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () =>
    finish({ items: [payment('stale')], nextCursor: null }),
  );
  expect(result.current.data).toEqual([]);
});

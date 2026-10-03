import { createHttpBillingGateway } from '../../src/infrastructure/http-billing-gateway';
import type { OperationContext } from '@quarks.studio/registry/http';
it('lists payments through the authenticated transport without caching', async () => {
  const fetchJson = jest
    .fn()
    .mockResolvedValue({ items: [], nextCursor: null });
  const gateway = createHttpBillingGateway({
    fetchJson,
  } as unknown as OperationContext);
  await expect(
    gateway.listPayments({ limit: 25, cursor: 'next+/=' }),
  ).resolves.toEqual({ items: [], nextCursor: null });
  expect(fetchJson).toHaveBeenCalledWith(
    'payments/me?limit=25&cursor=next%2B%2F%3D',
    { cache: 'no-store' },
  );
});

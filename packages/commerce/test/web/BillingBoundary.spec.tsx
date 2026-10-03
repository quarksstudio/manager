import { render, screen, waitFor } from '@testing-library/react';
import { CommerceProvider } from '@quarks.studio/commerce/presentation';
import { BillingBoundary } from '@quarks.studio/commerce/web';

it('loads payment history through the injected service without configuring a client', async () => {
  const listPayments = jest.fn().mockResolvedValue({
    items: [
      {
        id: 'receipt-1',
        kind: 'execution',
        provider: 'paypal',
        executedAt: '2026-01-01T00:00:00Z',
        amountCents: 1234,
        currency: 'USD',
      },
    ],
    nextCursor: null,
  });
  render(
    <CommerceProvider services={{ listPayments, createPaymentLink: jest.fn() }}>
      <BillingBoundary />
    </CommerceProvider>,
  );
  await waitFor(() => expect(listPayments).toHaveBeenCalledTimes(1));
  expect(await screen.findByText('paypal')).toBeTruthy();
});

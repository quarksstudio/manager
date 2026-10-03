import { fireEvent, render, screen } from '@testing-library/react';
import { PaymentHistory } from '@quarks.studio/commerce/web';
it('shows recorded payments without inventing missing values', () => {
  const onLoadMore = jest.fn();
  render(
    <PaymentHistory
      payments={[
        {
          id: 'p1',
          kind: 'subscription',
          provider: 'paypal',
          executedAt: '2026-09-01T00:00:00Z',
        },
      ]}
      loading={false}
      error={null}
      hasMore
      onRetry={jest.fn()}
      onLoadMore={onLoadMore}
    />,
  );
  expect(screen.getByText('Subscription')).toBeTruthy();
  expect(screen.getByText('paypal')).toBeTruthy();
  expect(screen.getAllByText('—')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(onLoadMore).toHaveBeenCalledTimes(1);
});
it('offers retry after an API failure', () => {
  const onRetry = jest.fn();
  render(
    <PaymentHistory
      payments={[]}
      loading={false}
      error={new Error('offline')}
      hasMore={false}
      onRetry={onRetry}
      onLoadMore={jest.fn()}
    />,
  );
  expect(screen.getByRole('alert')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
it('shows an empty history', () => {
  render(
    <PaymentHistory
      payments={[]}
      loading={false}
      error={null}
      hasMore={false}
      onRetry={jest.fn()}
      onLoadMore={jest.fn()}
    />,
  );
  expect(screen.getByText('No recorded payments yet.')).toBeTruthy();
});

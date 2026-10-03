import { usePayments } from '../hooks';
import { PaymentHistory } from './components';
export function BillingBoundary() {
  const payments = usePayments();
  return (
    <PaymentHistory
      payments={payments.data}
      loading={payments.loading}
      error={payments.error}
      hasMore={payments.hasMore}
      onRetry={
        payments.hasMore
          ? () => {
              void payments.loadMore();
            }
          : payments.refetch
      }
      onLoadMore={() => {
        void payments.loadMore();
      }}
    />
  );
}

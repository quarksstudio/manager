import type { PaymentRecord } from '../../index';
export interface PaymentHistoryProps {
  payments: PaymentRecord[];
  loading: boolean;
  error: unknown;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}
const labels = {
  execution: 'Package execution',
  subscription: 'Subscription',
  'payment-source': 'Payment method charge',
};
function amount(payment: PaymentRecord): string {
  if (payment.amountCents === undefined || !payment.currency) return '—';
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: payment.currency,
    }).format(payment.amountCents / 100);
  } catch {
    return `${(payment.amountCents / 100).toFixed(2)} ${payment.currency}`;
  }
}
export function PaymentHistory({
  payments,
  loading,
  error,
  hasMore,
  onRetry,
  onLoadMore,
}: PaymentHistoryProps) {
  return (
    <section aria-label="Payment history" aria-busy={loading}>
      {error ? (
        <div role="alert">
          <p>Could not load your payments.</p>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}
      {loading ? <p role="status">Loading payments…</p> : null}
      {!loading && !error && payments.length === 0 ? (
        <p>No recorded payments yet.</p>
      ) : null}
      {payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {['Date', 'Concept', 'Provider', 'Amount', 'Status'].map(
                  (label) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-slate-800">
                  <td className="p-3">
                    <time dateTime={payment.executedAt}>
                      {new Date(payment.executedAt).toLocaleString('en', {
                        timeZone: 'UTC',
                      })}{' '}
                      UTC
                    </time>
                  </td>
                  <td className="p-3">
                    {labels[payment.kind]}
                    {payment.productId ? ` · ${payment.productId}` : ''}
                  </td>
                  <td className="p-3">{payment.provider}</td>
                  <td className="p-3">{amount(payment)}</td>
                  <td className="p-3">{payment.status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {hasMore ? (
        <button
          type="button"
          disabled={loading}
          onClick={onLoadMore}
          className="mt-4 rounded border border-slate-600 px-4 py-2"
        >
          Load more
        </button>
      ) : null}
    </section>
  );
}

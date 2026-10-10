import type { SubscriptionRecord } from '../../domain/subscription';
import { formatPrice } from '../../domain/money';
import { QuarkTheme, formatDate } from '@quarks.studio/web-ui';

export interface SubscriptionsListProps {
  subscriptions: SubscriptionRecord[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
  past_due: 'Pago atrasado',
  error: 'Error',
};

/** Every subscription of the account, whatever package it belongs to. */
export function SubscriptionsList({
  subscriptions,
  loading,
  error,
  onRetry,
}: SubscriptionsListProps) {
  return (
    <QuarkTheme>
      <section
        aria-label="Planes suscritos"
        aria-busy={loading}
        data-testid="subscriptions-list"
      >
        <h3 className="!mb-3 text-base font-semibold">Planes suscritos</h3>
        {error && (
          <div role="alert" className="mb-3 text-sm text-red-400">
            <p>{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 rounded border border-slate-600 px-3 py-1"
              >
                Reintentar
              </button>
            )}
          </div>
        )}
        {loading && !error && <p role="status">Cargando suscripciones…</p>}
        {!loading && !error && subscriptions.length === 0 && (
          <p className="text-sm text-slate-500">
            No tienes ninguna suscripción activa.
          </p>
        )}
        {subscriptions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {['Paquete', 'Plan', 'Estado', 'Importe', 'Periodo'].map(
                    (label) => (
                      <th key={label} className="p-3">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr
                    key={subscription.id}
                    className="border-t border-slate-800"
                    data-testid={`subscription-${subscription.id}`}
                  >
                    <td className="p-3 font-mono">{subscription.packageId}</td>
                    <td className="p-3">{subscription.productId}</td>
                    <td className="p-3">
                      {STATUS_LABEL[subscription.status] ??
                        subscription.status}
                    </td>
                    <td className="p-3">
                      {formatPrice(
                        subscription.amountCents,
                        subscription.currency,
                      )}
                    </td>
                    <td className="p-3 text-slate-400">
                      {subscription.currentPeriodStart
                        ? formatDate(subscription.currentPeriodStart)
                        : '—'}
                      {' → '}
                      {subscription.currentPeriodEnd
                        ? formatDate(subscription.currentPeriodEnd)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </QuarkTheme>
  );
}

import type { MonthlyTotal } from '../../domain/monthly-totals';
import { formatPrice } from '../../domain/money';
import { QuarkTheme } from '@quarks.studio/web-ui';

export interface MonthlyTotalsProps {
  rows: MonthlyTotal[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

function money(totals: MonthlyTotal['totals']): string {
  return Object.entries(totals)
    .map(([currency, amount]) => formatPrice(amount, currency))
    .join(' + ');
}

/** The month-by-month spend of every subscription the account holds. */
export function MonthlyTotals({
  rows,
  loading,
  error,
  onRetry,
}: MonthlyTotalsProps) {
  return (
    <QuarkTheme>
      <section
        aria-label="Total mes a mes"
        aria-busy={loading}
        data-testid="monthly-totals"
      >
        <h3 className="!mb-3 text-base font-semibold">Total mes a mes</h3>
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
        {!loading && !error && rows.length === 0 && (
          <p className="text-sm text-slate-500">
            Todavía no hay suscripciones registradas.
          </p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {['Mes', 'Suscripciones', 'Total'].map((label) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.month}
                    className="border-t border-slate-800"
                    data-testid={`monthly-total-${row.month}`}
                  >
                    <td className="p-3 font-mono">{row.month}</td>
                    <td className="p-3">
                      <ul className="space-y-1">
                        {row.entries.map((entry) => (
                          <li
                            key={`${entry.subscriptionId}-${entry.productId}`}
                            className="text-slate-400"
                          >
                            {entry.packageId} · {entry.productId} ·{' '}
                            {entry.status}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-3 font-medium">{money(row.totals)}</td>
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

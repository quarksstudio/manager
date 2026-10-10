import { useCallback, useEffect, useMemo, useState } from 'react';
import { createConfiguredContext } from '@quarks.studio/config/http';

import { createHttpBillingGateway } from '../../http';
import { buildMonthlyTotals } from '../../domain/monthly-totals';
import type { SubscriptionRecord } from '../../domain/subscription';
import { SubscriptionsList } from '../components/SubscriptionsList';
import { MonthlyTotals } from '../components/MonthlyTotals';

export interface ConfiguredMonthlyTotalsProps {
  className?: string;
}

/**
 * The subscription panel behind the package's configuration tab. The session is
 * resolved per request, so a login or a logout in another tab is visible here
 * without a reload.
 */
export function ConfiguredMonthlyTotals({
  className,
}: ConfiguredMonthlyTotalsProps) {
  const [state, setState] = useState<{
    subscriptions: SubscriptionRecord[];
    loading: boolean;
    error?: string;
  }>({ subscriptions: [], loading: true });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const gateway = createHttpBillingGateway(createConfiguredContext());
      setState({ subscriptions: await gateway.listSubscriptions(), loading: false });
    } catch {
      setState({
        subscriptions: [],
        loading: false,
        error: 'No se pudieron cargar las suscripciones.',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    () => buildMonthlyTotals(state.subscriptions),
    [state.subscriptions],
  );

  return (
    <div className={className} data-testid="configured-monthly-totals">
      <SubscriptionsList
        subscriptions={state.subscriptions}
        loading={state.loading}
        error={state.error}
        onRetry={load}
      />
      <div className="mt-6">
        <MonthlyTotals
          rows={rows}
          loading={state.loading}
          error={state.error}
          onRetry={load}
        />
      </div>
    </div>
  );
}

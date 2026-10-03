import type { PendingSystem } from '../../index';
import { Alert } from 'antd';

import { QuarkTheme } from '@quarks.studio/web-ui';

export interface SystemHintsProps {
  pending: PendingSystem[];
}

/**
 * A hint, never a choice. These gateways answer the subscription create with
 * `400 PAYMENT_SOURCE_REQUIRED` until a card is stored first, so offering them
 * as a button would sell a dead end.
 */
export function SystemHints({ pending }: SystemHintsProps) {
  if (pending.length === 0) return null;
  return (
    <QuarkTheme>
      <Alert
        type="info"
        showIcon
        data-testid="payment-system-hints"
        className="!mt-4"
        title="Payment systems not available yet"
        description={
          <ul className="m-0 list-disc pl-5 text-sm">
            {pending.map((system) => (
              <li key={system.id}>
                <span className="font-medium">{system.name}</span>:{' '}
                {system.reason}
              </li>
            ))}
          </ul>
        }
      />
    </QuarkTheme>
  );
}

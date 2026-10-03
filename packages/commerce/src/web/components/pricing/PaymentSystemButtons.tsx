import { usePaymentLink } from '@quarks.studio/commerce/react';
import { type PaymentLinkTarget } from '@quarks.studio/commerce';
import type { PaymentSystem } from '@quarks.studio/commerce';
import { Button, Typography } from 'antd';

import { QuarkTheme } from '@quarks.studio/web-ui';

export interface PaymentSystemButtonsProps {
  /** The product to charge, already resolved to a plan or a certification. */
  target: PaymentLinkTarget;
  systems: PaymentSystem[];
  /** See `UsePaymentLinkOptions`: the host's own registry endpoint, when it has one. */
  apiBaseUrl?: string;
  label?: string;
  block?: boolean;
}

const FAILURE_COPY = {
  unauthenticated: 'You need to sign in to pay.',
  unavailable: 'This purchase is not available right now.',
  unknown: 'Could not create the payment link.',
} as const;

/**
 * One button per system, never a form and never a link: a click asks the
 * registry for the hosted page and the browser goes there. The amount is never
 * computed here — the gateway builds the link from the product id it resolves.
 */
export function PaymentSystemButtons({
  target,
  systems,
  apiBaseUrl,
  label = 'Pay with',
  block = true,
}: PaymentSystemButtonsProps) {
  const { pay, isPaying, failure } = usePaymentLink({ apiBaseUrl });
  if (systems.length === 0) return null;
  return (
    <QuarkTheme>
      <div
        data-testid="payment-system-buttons"
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-sm text-slate-500">{label}</span>
        {systems.map((system) => (
          <Button
            key={system.id}
            type="primary"
            block={block && systems.length === 1}
            loading={isPaying}
            disabled={isPaying}
            onClick={() => void pay({ ...target, system: system.id })}
          >
            {system.name}
          </Button>
        ))}
        {failure && (
          <Typography.Text type="danger" className="text-sm">
            {FAILURE_COPY[failure]}
          </Typography.Text>
        )}
      </div>
    </QuarkTheme>
  );
}

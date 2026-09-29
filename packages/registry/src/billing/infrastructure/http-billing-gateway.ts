import type { OperationContext } from '../../transport/http-context';
import type {
  BillingSystem,
  CreateSubscriptionInput,
  ExecutePaymentInput,
  PaymentExecution,
  PaymentMethodTokenInput,
  Subscription,
  TokenizedPaymentMethod,
} from '../domain/billing';
import type { BillingGateway } from '../application/billing.port';

/**
 * Billing surface. The backing service does not exist yet, so the wire format
 * below is the contract we *intend*, not one we have verified: every operation
 * posts to a flat path with `system` in the body, while `gatewayPath()` in this
 * file describes a path-scoped alternative that nothing calls.
 *
 * Open decision for whoever implements the service: does it expect
 * `gateway/{system}/payment-sources`, or `payment-sources` with `system` in the
 * body? The answer decides whether `gatewayPath()` becomes live or gets deleted.
 * Until then `test/billing/infrastructure/http-billing-gateway.spec.ts` pins the
 * current shape so the change is a deliberate, visible edit.
 */
function gatewayPath(system: string, path: string): string {
  if (!system.trim()) {
    throw new Error('Gateway system is required');
  }

  return `gateway/${encodeURIComponent(system)}/${path}`;
}

function idempotencyHeaders(idempotencyKey?: string): Record<string, string> {
  return idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
}

export function createHttpBillingGateway(
  context: OperationContext,
): BillingGateway {
  return {
    tokenizePaymentMethod: (
      system: BillingSystem,
      input: PaymentMethodTokenInput,
    ): Promise<TokenizedPaymentMethod> =>
      context.fetchJson('payment-sources', {
        method: 'POST',
        body: {
          system,
          token: input.providerToken,
          provider: input.provider,
        },
      }),

    createSubscription: (
      system: BillingSystem,
      input: CreateSubscriptionInput,
      idempotencyKey?: string,
    ): Promise<Subscription> =>
      context.fetchJson('subscriptions', {
        method: 'POST',
        headers: idempotencyHeaders(idempotencyKey),
        body: {
          ...input,
          system,
          productId: input.planId,
          paymentSourceId: input.paymentMethodId,
        },
      }),

    getSubscription: (
      system: BillingSystem,
      subscriptionId: string,
    ): Promise<Subscription> =>
      context.fetchJson(
        `subscriptions/${encodeURIComponent(subscriptionId)}`,
      ),

    cancelSubscription: (
      system: BillingSystem,
      subscriptionId: string,
      idempotencyKey?: string,
    ): Promise<Subscription> =>
      context.fetchJson(
        `subscriptions/${encodeURIComponent(subscriptionId)}`,
        {
          method: 'DELETE',
          headers: idempotencyHeaders(idempotencyKey),
        },
      ),

    execute: (
      system: BillingSystem,
      input: ExecutePaymentInput,
      idempotencyKey?: string,
    ): Promise<PaymentExecution> =>
      context.fetchJson('payments/execute', {
        method: 'POST',
        headers: idempotencyHeaders(idempotencyKey),
        body: { ...input, system },
      }),
  };
}

import type { OperationContext } from '@quarks.studio/types/http';
import type {
  BillingSystem,
  CreateSubscriptionInput,
  CreatedSubscription,
  ExecutePaymentInput,
  PaymentExecution,
  PaymentLink,
  PaymentMethodTokenInput,
  SubscriptionCancelResult,
  SubscriptionRecord,
  TokenizedPaymentMethod,
} from '../domain/billing';
import type { PaymentLinkTarget } from '../domain/payment-link-path';
import { paymentLinkPath } from '../domain/payment-link-path';
import type { PaymentSystem, PaymentSystems } from '../domain/payment-systems';
import type { BillingGateway } from '../application/billing.port';

function idempotencyHeaders(idempotencyKey?: string): Record<string, string> {
  return idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
}

/** `GET /v1/products` and `GET /v1/subscriptions/me` answer with `null` or `[]`. */
function list<T>(rows: T[] | null | undefined): T[] {
  return Array.isArray(rows) ? rows : [];
}

export function createHttpBillingGateway(
  context: OperationContext,
): BillingGateway {
  return {
    listPayments: (options = {}) => {
      const query = new URLSearchParams();
      if (options.limit !== undefined)
        query.set('limit', String(options.limit));
      if (options.cursor !== undefined) query.set('cursor', options.cursor);
      const suffix = query.size ? `?${query}` : '';
      return context.fetchJson(`payments/me${suffix}`, { cache: 'no-store' });
    },
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
    ): Promise<CreatedSubscription> =>
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

    listSubscriptions: (): Promise<SubscriptionRecord[]> =>
      context
        .fetchJson<SubscriptionRecord[] | null>('subscriptions/me')
        .then(list),

    /**
     * No `country` query on purpose: the controller resolves it from the query,
     * the proxy headers or the caller's IP
     * (`GatewayCatalogController.systems`), and sending our own would be a
     * guess that hides the real location.
     */
    listSystems: (): Promise<PaymentSystems> =>
      context
        .fetchJson<PaymentSystems | null>('gateway/systems')
        .then((answer) => ({
          country: answer?.country ?? null,
          source: answer?.source ?? 'unknown',
          systems: list(answer?.systems).map(toPaymentSystem),
        })),

    createPaymentLink: (
      system: BillingSystem,
      target: PaymentLinkTarget,
    ): Promise<PaymentLink> =>
      context.fetchJson(paymentLinkPath(system, target)),

    getSubscription: (
      system: BillingSystem,
      subscriptionId: string,
    ): Promise<SubscriptionRecord> =>
      context.fetchJson(`subscriptions/${encodeURIComponent(subscriptionId)}`),

    cancelSubscription: (
      system: BillingSystem,
      subscriptionId: string,
      idempotencyKey?: string,
    ): Promise<SubscriptionCancelResult> =>
      context.fetchJson(`subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: 'DELETE',
        headers: idempotencyHeaders(idempotencyKey),
      }),

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

/** `countries: null` means the gateway serves every country. */
function toPaymentSystem(system: PaymentSystem): PaymentSystem {
  return {
    id: system.id,
    name: system.name,
    countries: system.countries ? [...system.countries] : null,
  };
}

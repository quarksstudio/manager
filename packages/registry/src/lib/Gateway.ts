import type {
  CreateSubscriptionInput,
  ExecutePaymentInput,
  PaymentExecution,
  PaymentMethodTokenInput,
  Subscription,
  TokenizedPaymentMethod,
} from '@quark/types/models';

function gatewayPath(system: string, path: string): string {
  if (!system.trim()) {
    throw new Error('Gateway system is required');
  }

  return `gateway/${encodeURIComponent(system)}/${path}`;
}

function idempotencyHeaders(idempotencyKey?: string): Record<string, string> {
  return idempotencyKey
    ? { 'Idempotency-Key': idempotencyKey }
    : {};
}

export async function tokenizePaymentMethod(
  this: any,
  system: string,
  input: PaymentMethodTokenInput,
): Promise<TokenizedPaymentMethod> {
  return this._fetch('payment-sources', {
    method: 'POST',
    body: {
      system,
      token: input.providerToken,
      provider: input.provider,
    },
  });
}

export async function createSubscription(
  this: any,
  system: string,
  input: CreateSubscriptionInput,
  idempotencyKey?: string,
): Promise<Subscription> {
  return this._fetch('subscriptions', {
    method: 'POST',
    headers: idempotencyHeaders(idempotencyKey),
    body: {
      ...input,
      system,
      productId: input.planId,
      paymentSourceId: input.paymentMethodId,
    },
  });
}

export async function getSubscription(
  this: any,
  system: string,
  subscriptionId: string,
): Promise<Subscription> {
  return this._fetch(
    `subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
}

export async function cancelSubscription(
  this: any,
  system: string,
  subscriptionId: string,
  idempotencyKey?: string,
): Promise<Subscription> {
  return this._fetch(
    `subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: 'DELETE',
      headers: idempotencyHeaders(idempotencyKey),
    },
  );
}

export async function execute(
  this: any,
  system: string,
  input: ExecutePaymentInput,
  idempotencyKey?: string,
): Promise<PaymentExecution> {
  return this._fetch('payments/execute', {
    method: 'POST',
    headers: idempotencyHeaders(idempotencyKey),
    body: { ...input, system },
  });
}

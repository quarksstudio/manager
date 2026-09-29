import type {
  BillingSystem,
  CreateSubscriptionInput,
  ExecutePaymentInput,
  PaymentExecution,
  PaymentMethodTokenInput,
  Subscription,
  TokenizedPaymentMethod,
} from '../domain/billing';

/**
 * Every write takes an idempotency key: a payment or a subscription must not be
 * created twice because a request was retried.
 */
export interface BillingGateway {
  tokenizePaymentMethod(
    system: BillingSystem,
    input: PaymentMethodTokenInput,
  ): Promise<TokenizedPaymentMethod>;
  createSubscription(
    system: BillingSystem,
    input: CreateSubscriptionInput,
    idempotencyKey?: string,
  ): Promise<Subscription>;
  getSubscription(
    system: BillingSystem,
    subscriptionId: string,
  ): Promise<Subscription>;
  cancelSubscription(
    system: BillingSystem,
    subscriptionId: string,
    idempotencyKey?: string,
  ): Promise<Subscription>;
  execute(
    system: BillingSystem,
    input: ExecutePaymentInput,
    idempotencyKey?: string,
  ): Promise<PaymentExecution>;
}

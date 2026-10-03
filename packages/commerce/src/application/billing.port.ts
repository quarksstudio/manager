import type {
  PaymentListOptions,
  PaymentPage,
} from '../domain/payment-history';
import type {
  CreatedSubscription,
  PaymentLink,
  SubscriptionCancelResult,
  SubscriptionRecord,
} from '../domain/subscription';
import type {
  BillingSystem,
  CreateSubscriptionInput,
  ExecutePaymentInput,
  PaymentExecution,
  PaymentMethodTokenInput,
  TokenizedPaymentMethod,
} from '../domain/billing';
import type { PaymentSystems } from '../domain/payment-systems';
import type { PaymentLinkTarget } from '../domain/payment-link-path';

export type {
  PaymentLink,
  PaymentLinkTarget,
  PaymentSystems,
  SubscriptionCancelResult,
};

/**
 * Every write takes an idempotency key: a payment or a subscription must not be
 * created twice because a request was retried.
 *
 * `listSystems`, `listSubscriptions` and `createPaymentLink` are the operations
 * the pricing pages use. The card operations below stay because nothing calls
 * them yet and deleting them would be a larger change than this one.
 */
export interface BillingGateway {
  listPayments(options?: PaymentListOptions): Promise<PaymentPage>;
  tokenizePaymentMethod(
    system: BillingSystem,
    input: PaymentMethodTokenInput,
  ): Promise<TokenizedPaymentMethod>;
  createSubscription(
    system: BillingSystem,
    input: CreateSubscriptionInput,
    idempotencyKey?: string,
  ): Promise<CreatedSubscription>;
  listSubscriptions(): Promise<SubscriptionRecord[]>;
  listSystems(): Promise<PaymentSystems>;
  createPaymentLink(
    system: BillingSystem,
    target: PaymentLinkTarget,
  ): Promise<PaymentLink>;
  getSubscription(
    system: BillingSystem,
    subscriptionId: string,
  ): Promise<SubscriptionRecord>;
  cancelSubscription(
    system: BillingSystem,
    subscriptionId: string,
    idempotencyKey?: string,
  ): Promise<SubscriptionCancelResult>;
  execute(
    system: BillingSystem,
    input: ExecutePaymentInput,
    idempotencyKey?: string,
  ): Promise<PaymentExecution>;
}

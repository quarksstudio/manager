export type {
  CreateSubscriptionInput,
  ExecutePaymentInput,
  PaymentExecution,
  PaymentMethodTokenInput,
  Subscription,
  TokenizedPaymentMethod,
} from '@quarks.studio/types/models';

/**
 * The payment provider tokenizes card details on the client side. A card number
 * or a security code that reaches this context is a defect, not a feature.
 */
export type BillingSystem = string;

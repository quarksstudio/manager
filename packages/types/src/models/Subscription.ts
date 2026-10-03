export type SubscriptionRole = 'author' | 'sponsor';

export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'payment_failed';

export interface SubscriptionBenefits {
  tier2: number;
  tier3: number;
  tier4: number;
}

export interface PaymentMethodTokenInput {
  providerToken: string;
  provider: string;
}

export interface TokenizedPaymentMethod {
  id: string;
  provider: string;
  brand?: string;
  last4?: string;
  expirationMonth?: number;
  expirationYear?: number;
}

export interface CreateSubscriptionInput {
  packageId: string;
  planId: string;
  role: SubscriptionRole;
  paymentMethodId: string;
}

export interface Subscription {
  id: string;
  userId: string;
  packageId: string;
  planId: string;
  role: SubscriptionRole;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  benefits: SubscriptionBenefits;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

/**
 * The statuses the subscriptions module actually persists. Deliberately not
 * `SubscriptionStatus`: that union was written for a service that does not
 * exist yet, and reusing it would make `error` look impossible.
 */
export type StoredSubscriptionStatus =
  'pending' | 'active' | 'cancelled' | 'past_due' | 'error';

/**
 * One row of `GET /v1/subscriptions/me`. There is no `system` filter on that
 * route, so a caller receives every subscription the user holds and picks the
 * package itself; `productId` is the plan product.
 */
export interface SubscriptionRecord {
  id: string;
  productId: string;
  packageId: string;
  userId: string;
  system: string;
  providerSubscriptionId?: string;
  status: StoredSubscriptionStatus;
  amountCents: number;
  currency: string;
  period: 'month';
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  error?: string;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string | null;
  cancelledAt?: string | null;
}

/**
 * What `POST /v1/subscriptions` answers with. Not the stored document: the
 * subscription only exists once the gateway confirms it, and the client needs
 * the `approvalUrl` to send the payer to PayPal.
 */
export interface CreatedSubscription {
  id: string;
  status: StoredSubscriptionStatus;
  approvalUrl?: string;
  providerSubscriptionId?: string;
}

/** `GET /v1/gateway/...`: the hosted page the payer is sent to. */
export interface PaymentLink {
  system: string;
  url: string;
  reference: string;
}

/** `DELETE /v1/subscriptions/:id` answers an acknowledgement, not the row. */
export interface SubscriptionCancelResult {
  success: boolean;
}

export interface ExecutePaymentInput {
  versionId: string;
  productId: string;
  packageId: string;
}

export interface PaymentExecution {
  id: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: number;
  currency: string;
  provider: string;
}

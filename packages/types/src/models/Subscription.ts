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

export type PaymentKind = 'execution' | 'subscription' | 'payment-source';
export interface PaymentRecord {
  id: string;
  kind: PaymentKind;
  provider: string;
  executedAt: string;
  productId?: string;
  subscriptionId?: string;
  status?: string;
  amountCents?: number;
  currency?: string;
}
export interface PaymentPage {
  items: PaymentRecord[];
  nextCursor: string | null;
}
export interface PaymentListOptions {
  limit?: number;
  cursor?: string;
}

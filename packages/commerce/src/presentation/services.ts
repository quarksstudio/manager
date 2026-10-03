import type {
  PaymentRecord,
  PaymentPage,
  PaymentListOptions,
} from '../domain/payment-history';
import { createContext, createElement, type ReactNode } from 'react';
import { type PaymentLinkFailure } from '../domain/payment-link-failure';
import type {
  PaymentLinkRequest,
  PaymentLinkTarget,
} from '../domain/payment-link-path';
export interface CommerceServices {
  createPaymentLink(
    system: string,
    target: PaymentLinkTarget,
    baseUrl?: string,
  ): Promise<{ url: string }>;
  listPayments(options?: PaymentListOptions): Promise<PaymentPage>;
}
export const ServicesContext = createContext<CommerceServices | null>(null);
export function CommerceProvider({
  services,
  children,
}: {
  services: CommerceServices;
  children: ReactNode;
}) {
  return createElement(ServicesContext.Provider, { value: services }, children);
}
export interface UsePaymentLinkOptions {
  /**
   * Defaults to the ambient client, which reads the configured registry. A host
   * that already resolved its own endpoint passes it here instead of leaving
   * the payment call to guess.
   */
  apiBaseUrl?: string;
  /** Overridable so a test can watch the redirect without a real navigation. */
  navigate?: (url: string) => void;
}
export interface UsePaymentLinkReturn {
  pay: (request: PaymentLinkRequest) => Promise<void>;
  isPaying: boolean;
  /** The named case, not a sentence: the surface owns the wording. */
  failure: PaymentLinkFailure | null;
  reset: () => void;
}
export function redirectTo(url: string): void {
  if (typeof window === 'undefined')
    throw new Error('A payment redirect needs a browser.');
  window.location.assign(url);
}
export interface UsePaymentsReturn {
  data: PaymentRecord[];
  loading: boolean;
  error: unknown;
  hasMore: boolean;
  refetch: () => void;
  loadMore: () => Promise<void>;
}

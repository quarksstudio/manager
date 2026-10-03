/**
 * What a caller can be told about a refused payment link. The transport only
 * carries the status, so the registry names the case and the surface that shows
 * it writes the words: a registry does not get to decide what a payer reads.
 */
export type PaymentLinkFailure = 'unauthenticated' | 'unavailable' | 'unknown';

/** 401 is no session, 409 is a refusal from the server (a step down, a duplicate). */
export function paymentLinkFailure(status?: number): PaymentLinkFailure {
  if (status === 401) return 'unauthenticated';
  if (status === 409) return 'unavailable';
  return 'unknown';
}

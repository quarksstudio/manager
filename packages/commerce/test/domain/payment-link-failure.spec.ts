import { paymentLinkFailure, type PaymentLinkFailure } from '../../src/index';

const status = (code: number | undefined): PaymentLinkFailure =>
  paymentLinkFailure(code);

describe('paymentLinkFailure', () => {
  it('names the case the gateway refused, never the sentence', () => {
    expect(status(401)).toBe('unauthenticated');
    expect(status(409)).toBe('unavailable');
  });

  it('keeps every other outcome, including a transport crash, in one bucket', () => {
    // Without a status there is nothing to say, and a 500 is not the payer's
    // fault, so both land on the same unknown case.
    expect(status(undefined)).toBe('unknown');
    expect(status(500)).toBe('unknown');
  });
});

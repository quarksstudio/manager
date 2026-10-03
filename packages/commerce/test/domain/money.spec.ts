import { formatPrice } from '../../src/index';

describe('formatPrice', () => {
  it('turns integer cents into a currency amount', () => {
    expect(formatPrice(900, 'USD')).toMatch(/9(\.00)?/);
    expect(formatPrice(1999, 'USD')).toMatch(/19\.99/);
  });

  it('calls a zero amount free rather than missing', () => {
    expect(formatPrice(0, 'USD')).toBe('Gratis');
  });

  /** A negative or NaN amount is bad data, not a discount. */
  it('never renders a negative price', () => {
    expect(formatPrice(-100, 'USD')).toBe('Gratis');
    expect(formatPrice(Number.NaN, 'USD')).toBe('Gratis');
  });

  it('survives a currency the runtime rejects', () => {
    expect(() => formatPrice(500, 'US')).not.toThrow();
    expect(formatPrice(500, 'US')).toContain('5.00');
  });

  it('never throws on an empty currency', () => {
    expect(formatPrice(500, '').length).toBeGreaterThan(0);
  });
});

import { partitionPlanSystems, planSignupNote } from '../../src/index';
import { paymentLinkPath } from '../../src/index';

describe('planSignupNote', () => {
  it('knows PayPal approves a plan on its own hosted page', () => {
    expect(planSignupNote('paypal')).toMatch(/PayPal/);
  });

  /**
   * Wompi, MercadoPago and dLocal answer the subscription create with
   * `400 PAYMENT_SOURCE_REQUIRED` until a card is stored, so they are not
   * self-serve yet.
   */
  it('has no note for a gateway that needs a stored card', () => {
    expect(planSignupNote('wompi')).toBeUndefined();
    expect(planSignupNote('mercadopago')).toBeUndefined();
    expect(planSignupNote('dlocal')).toBeUndefined();
  });

  it('is case insensitive', () => {
    expect(planSignupNote(' PayPal ')).toBeDefined();
  });
});

describe('partitionPlanSystems', () => {
  it('separates the eligible gateways from the hints', () => {
    const { eligible, pending } = partitionPlanSystems([
      { id: 'paypal', name: 'PayPal', countries: null },
      { id: 'wompi', name: 'Wompi', countries: ['CO'] },
    ]);

    expect(eligible.map((system) => system.id)).toEqual(['paypal']);
    expect(pending.map((system) => system.id)).toEqual(['wompi']);
    expect(pending[0].reason.length).toBeGreaterThan(0);
  });
});

describe('paymentLinkPath', () => {
  /**
   * The route has no `plan/` segment: the product's own `kind` decides what the
   * server builds, and the segment count is what separates the two.
   */
  it('builds a two-segment path for a plan', () => {
    expect(
      paymentLinkPath('paypal', {
        kind: 'plan',
        packageId: 'demo',
        productId: 'PL1',
      }),
    ).toBe('gateway/paypal/PL1/demo');
  });

  it('builds a three-segment path pinned to a version for a certification', () => {
    expect(
      paymentLinkPath('paypal', {
        kind: 'certification',
        packageId: 'demo',
        versionId: '1.0.0',
        productId: 'N2',
      }),
    ).toBe('gateway/paypal/N2/demo@1.0.0');
  });

  it('encodes each segment but keeps the pin separator literal', () => {
    const path = paymentLinkPath('wompi', {
      kind: 'certification',
      packageId: '@scope/demo',
      versionId: '1.0.0+build',
      productId: 'N2',
    });
    expect(path).toBe('gateway/wompi/N2/%40scope%2Fdemo@1.0.0%2Bbuild');
  });
});

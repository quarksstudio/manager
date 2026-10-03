import { hasTierOverlap, isPurchasable, sortByPrice } from '../../src/index';
import { tierName, type CatalogProduct } from '../../src/index';

const product = (over: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id: 'N1',
  kind: 'tier',
  name: 'Tier 1',
  description: '',
  amountCents: 1000,
  currency: 'USD',
  country: null,
  tier: 1,
  active: true,
  features: [],
  ...over,
});

describe('isPurchasable', () => {
  it('only goes up: the server refuses a downward step with UPWARD_ONLY', () => {
    expect(isPurchasable(product({ tier: 2 }), 1)).toBe(true);
    expect(isPurchasable(product({ tier: 1 }), 1)).toBe(false);
    expect(isPurchasable(product({ tier: 1 }), 3)).toBe(false);
  });

  it('refuses an inactive product even when the tier is free', () => {
    expect(isPurchasable(product({ active: false }), 0)).toBe(false);
  });
});

describe('sortByPrice', () => {
  it('orders plans by price without touching the input', () => {
    const plans = [
      product({ id: 'B', kind: 'plan', amountCents: 900 }),
      product({ id: 'A', kind: 'plan', amountCents: 300 }),
    ];
    expect(sortByPrice(plans).map((row) => row.id)).toEqual(['A', 'B']);
    expect(plans.map((row) => row.id)).toEqual(['B', 'A']);
  });
});

describe('hasTierOverlap', () => {
  it('is false for a clean ladder', () => {
    expect(
      hasTierOverlap([
        product({ id: 'N1', tier: 1 }),
        product({ id: 'N2', tier: 2 }),
      ]),
    ).toBe(false);
  });

  /**
   * The `id` is the key, so two rows sharing a tier are a bad seed, not two
   * prices. This reports it; it does not hide a row.
   */
  it('reports two products sharing a tier', () => {
    expect(
      hasTierOverlap([
        product({ id: 'N1', tier: 1 }),
        product({ id: 'N1b', tier: 1 }),
      ]),
    ).toBe(true);
  });

  it('ignores plans, which all sit at tier 0', () => {
    expect(
      hasTierOverlap([
        product({ id: 'PL1', kind: 'plan', tier: 0 }),
        product({ id: 'PL2', kind: 'plan', tier: 0 }),
      ]),
    ).toBe(false);
  });
});

describe('tierName', () => {
  it('maps the numeric tier to the name the UI already uses', () => {
    expect(tierName(1)).toBe('TIER_1');
    expect(tierName(4)).toBe('TIER_4');
  });

  it('clamps a value outside the ladder instead of throwing', () => {
    expect(tierName(0)).toBe('TIER_1');
    expect(tierName(9)).toBe('TIER_4');
  });
});

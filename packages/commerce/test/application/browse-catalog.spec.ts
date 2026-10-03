import { browsePlans, browseTierLadder } from '../../src/index';
import type { CatalogRemote } from '../../src/index';
import type { CatalogProduct } from '../../src/index';

const rows: CatalogProduct[] = [
  {
    id: 'PL2',
    kind: 'plan',
    name: 'Yearly',
    description: '',
    amountCents: 9000,
    currency: 'USD',
    country: null,
    tier: 0,
    active: true,
    features: [],
  },
  {
    id: 'N3',
    kind: 'tier',
    name: 'Tier 3',
    description: '',
    amountCents: 3000,
    currency: 'USD',
    country: null,
    tier: 3,
    active: true,
    features: [],
  },
  {
    id: 'PL1',
    kind: 'plan',
    name: 'Monthly',
    description: '',
    amountCents: 900,
    currency: 'USD',
    country: null,
    tier: 0,
    active: true,
    features: [],
    period: 'month',
  },
  {
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
  },
];

const remote = (all: CatalogProduct[] = rows): CatalogRemote => ({
  listAll: jest.fn(async () => all),
});

describe('browseTierLadder', () => {
  it('sorts the staircase by tier, not by price', async () => {
    const offers = await browseTierLadder(remote(), 0);
    expect(offers.map((offer) => offer.product.id)).toEqual(['N1', 'N3']);
  });

  it('marks only the tiers above the held one as purchasable', async () => {
    const offers = await browseTierLadder(remote(), 1);
    expect(offers.map((offer) => offer.purchasable)).toEqual([false, true]);
    expect(offers[0].held).toBe(1);
  });

  it('leaves plans out of the ladder', async () => {
    const offers = await browseTierLadder(remote(), 0);
    expect(offers.some((offer) => offer.product.kind === 'plan')).toBe(false);
  });
});

describe('browsePlans', () => {
  it('sorts plans by price and leaves certifications out', async () => {
    const plans = await browsePlans(remote());
    expect(plans.map((plan) => plan.id)).toEqual(['PL1', 'PL2']);
  });

  it('returns an empty list when the catalog is empty', async () => {
    await expect(browsePlans(remote([]))).resolves.toEqual([]);
  });
});

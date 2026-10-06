import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import {
  PlanGrid,
  PricingModeNav,
  SystemHints,
  TierMatrix,
} from '@quarks.studio/commerce/web';
import type { CatalogProduct, TierOffer } from '@quarks.studio/commerce';
import type { PaymentLinkRequest } from '@quarks.studio/commerce';

const mockPay = jest.fn();
const mockHook = {
  pay: mockPay,
  isPaying: false,
  failure: null,
  reset: jest.fn(),
};
jest.mock('@quarks.studio/commerce/hooks', () => ({
  usePaymentLink: () => mockHook,
}));

const plan = (over: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id: 'PL1',
  kind: 'plan',
  name: 'Monthly plan',
  description: 'Monthly credit.',
  amountCents: 900,
  currency: 'USD',
  country: null,
  tier: 0,
  active: true,
  features: ['Monthly credit'],
  period: 'month',
  ...over,
});

const tier = (
  level: number,
  over: Partial<CatalogProduct> = {},
): CatalogProduct => ({
  id: `N${level}`,
  kind: 'tier',
  name: `Tier ${level}`,
  description: `Level ${level}.`,
  amountCents: level * 1000,
  currency: 'USD',
  country: null,
  tier: level,
  active: true,
  features: [],
  ...over,
});

const offer = (
  product: CatalogProduct,
  purchasable: boolean,
  held = 0,
): TierOffer => ({ product, purchasable, held });

const eligible = [{ id: 'paypal', name: 'PayPal', countries: null }];
const pending = [
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    reason: 'Needs a stored card first.',
  },
];

beforeEach(() => {
  mockPay.mockReset();
});

it('links the mode nav as plain anchors, marking the current one', () => {
  render(<PricingModeNav mode="plans" baseUrl="/pricing" />);
  const links = screen.getAllByRole('link');
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    '/pricing?mode=products',
    '/pricing?mode=plans',
  ]);
  expect(
    screen.getByRole('link', { name: 'Plans' }).getAttribute('aria-current'),
  ).toBe('page');
  expect(
    screen
      .getByRole('link', { name: 'Certifications' })
      .getAttribute('aria-current'),
  ).toBeNull();
});

it('asks the gateway for the link when a plan is clicked', () => {
  render(
    <PlanGrid
      plans={[plan()]}
      systems={{ eligible, pending }}
      packageId="demo"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'PayPal' }));
  expect(mockPay).toHaveBeenCalledWith({
    kind: 'plan',
    packageId: 'demo',
    productId: 'PL1',
    system: 'paypal',
  });
  // A gateway that needs a stored card is a hint, never a button.
  expect(screen.queryByRole('button', { name: 'Mercado Pago' })).toBeNull();
  expect(screen.getByText('Mercado Pago')).toBeTruthy();
});

it('shows a catalog without a package as prices only', () => {
  render(<PlanGrid plans={[plan()]} systems={{ eligible, pending: [] }} />);
  expect(screen.queryByRole('button', { name: 'PayPal' })).toBeNull();
  expect(
    screen.getByText('Pick a package to subscribe to this plan.'),
  ).toBeTruthy();
});

it('renders the ladder in tier order and locks the tiers the caller holds', () => {
  render(
    <TierMatrix
      offers={[
        offer(tier(1), false, 2),
        offer(tier(2), false, 2),
        offer(tier(3), true, 2),
      ]}
      systems={eligible}
      packageId="demo"
      versionId="1.0.0"
    />,
  );
  const rows = screen
    .getAllByTestId(/^tier-N\d$/)
    .map((row) => row.getAttribute('data-testid'));
  expect(rows).toEqual(['tier-N1', 'tier-N2', 'tier-N3']);
  expect(screen.getAllByText('You already hold this level.').length).toBe(2);
  fireEvent.click(screen.getByRole('button', { name: 'PayPal' }));
  const request: PaymentLinkRequest = mockPay.mock.calls[0]?.[0];
  expect(request).toEqual({
    kind: 'certification',
    packageId: 'demo',
    versionId: '1.0.0',
    productId: 'N3',
    system: 'paypal',
  });
});

it('renders an empty catalog instead of a broken grid', () => {
  render(
    <PlanGrid
      plans={[]}
      systems={{ eligible, pending: [] }}
      packageId="demo"
    />,
  );
  expect(screen.getByTestId('plans-empty')).toBeTruthy();
});

it('lists the unavailable gateways with the reason they are unavailable', () => {
  render(<SystemHints pending={pending} />);
  expect(screen.getByText(/Needs a stored card first\./)).toBeTruthy();
});

/** Every pricing prop is a plain value, so both renders must agree. */
it('supports SSR', () => {
  const html = renderToString(
    <TierMatrix
      offers={[offer(tier(1), true)]}
      systems={eligible}
      packageId="demo"
      versionId="1.0.0"
    />,
  );
  expect(html).toContain('Tier 1 - Basic Certification');
  expect(html).toContain('PayPal');
  // A button, not a link: no local route and no query carry the target.
  expect(html).not.toContain('checkout');
});

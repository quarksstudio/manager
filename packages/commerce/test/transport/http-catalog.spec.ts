import {
  createHttpContext,
  type OperationContext,
} from '@quarks.studio/registry/http';
import { createHttpCatalog } from '@quarks.studio/commerce/http';

const fetchMock = jest.fn();
const BASE = 'https://registry.test/v1';

const context = (): OperationContext =>
  createHttpContext({ baseUrl: BASE, fetch: fetchMock as never });

const answer = (body: unknown) =>
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

const lastUrl = () => fetchMock.mock.calls.at(-1)?.[0] as string;

describe('http catalog', () => {
  beforeEach(() => fetchMock.mockReset());

  it('reads the global product list and sends no country', async () => {
    answer([]);
    await createHttpCatalog(context()).listAll();

    expect(lastUrl()).toBe(`${BASE}/products`);
    expect(lastUrl()).not.toContain('country');
  });

  it('maps a row, keeping the opaque id and the null country', async () => {
    answer([
      {
        id: 'N1',
        kind: 'tier',
        name: 'Tier 1',
        description: 'Basic',
        amountCents: 1000,
        currency: 'usd',
        country: null,
        tier: 1,
        active: true,
        features: ['a'],
      },
    ]);

    const [product] = await createHttpCatalog(context()).listAll();
    expect(product).toEqual({
      id: 'N1',
      kind: 'tier',
      name: 'Tier 1',
      description: 'Basic',
      amountCents: 1000,
      currency: 'usd',
      country: null,
      tier: 1,
      active: true,
      features: ['a'],
    });
  });

  it('defaults a plan to tier 0 so it is never compared to a held tier', async () => {
    answer([{ id: 'PL1', kind: 'plan', name: 'Monthly', amountCents: 900 }]);
    const [product] = await createHttpCatalog(context()).listAll();
    expect(product?.tier).toBe(0);
  });

  /** A row without a kind or an integer amount is not a product. */
  it('drops a malformed row instead of guessing', async () => {
    answer([
      { id: 'X1', kind: 'bundle', name: 'Nope', amountCents: 100 },
      { id: 'X2', kind: 'plan', name: 'Broken', amountCents: 10.5 },
      { id: 'X3', name: 'No kind', amountCents: 100 },
    ]);
    await expect(createHttpCatalog(context()).listAll()).resolves.toEqual([]);
  });

  it('treats a null body as an empty catalog', async () => {
    answer(null);
    await expect(createHttpCatalog(context()).listAll()).resolves.toEqual([]);
  });
});

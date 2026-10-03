import { loadConfig, resetConfig } from '@quarks.studio/config';

import { Client } from '../../../src/composition/ambient-client';

jest.mock('@quarks.studio/use-storage/storage', () => ({
  createStorage: jest.fn(() => ({
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
  })),
}));

const fetchMock = jest.fn();
const REGISTRY = 'https://registry.test/v1';

/**
 * The card routes below still describe a service shape the client never
 * reached. `listSystems`, `listSubscriptions` and `createPaymentLink` are real:
 * each is pinned to the route the server actually exposes, so a path change
 * becomes a deliberate edit instead of a 404 in production.
 */
describe('Gateway requests', () => {
  let gateway: Client['Gateway'];

  beforeEach(async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    process.env['QUARK_REGISTRY_URL'] = REGISTRY;
    resetConfig();
    await loadConfig();
    gateway = new Client('token').Gateway;
  });

  afterEach(() => {
    delete process.env['QUARK_REGISTRY_URL'];
    resetConfig();
  });

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    return {
      url,
      init,
      headers: new Headers(init.headers),
      body: JSON.parse(String(init.body ?? '{}')),
    };
  };

  it('tokenizes a payment method against a flat path with the system in the body', async () => {
    await gateway.tokenizePaymentMethod('quark', {
      providerToken: 'tok_1',
      provider: 'stripe',
    });

    const call = lastCall();
    expect(call.url).toBe(REGISTRY + '/payment-sources');
    expect(call.init.method).toBe('POST');
    expect(call.body).toEqual({
      system: 'quark',
      token: 'tok_1',
      provider: 'stripe',
    });
  });

  it('maps the plan to the product field the service expects', async () => {
    await gateway.createSubscription('quark', {
      packageId: 'pkg_1',
      planId: 'pro',
      role: 'sponsor',
      paymentMethodId: 'pm_1',
    });

    const call = lastCall();
    expect(call.url).toBe(REGISTRY + '/subscriptions');
    expect(call.body).toMatchObject({
      system: 'quark',
      productId: 'pro',
      paymentSourceId: 'pm_1',
    });
  });

  it('sends the idempotency key as a header when the caller provides one', async () => {
    await gateway.cancelSubscription('quark', 'sub_1', 'idem-1');

    const call = lastCall();
    expect(call.url).toBe(REGISTRY + '/subscriptions/sub_1');
    expect(call.init.method).toBe('DELETE');
    expect(call.headers.get('Idempotency-Key')).toBe('idem-1');
  });

  it('never routes through gatewayPath, and does not send the system on reads', async () => {
    await gateway.getSubscription('quark', 'sub_1');

    const call = lastCall();
    expect(call.url).toBe(REGISTRY + '/subscriptions/sub_1');
    expect(call.url).not.toContain('gateway/');
    expect(call.init.body).toBeUndefined();
  });

  it('executes a payment against the flat execute path', async () => {
    await gateway.execute('quark', {
      packageId: 'pkg_1',
      productId: 'pro',
      versionId: '1.0.0',
    });

    const call = lastCall();
    expect(call.url).toBe(REGISTRY + '/payments/execute');
    expect(call.body).toMatchObject({
      system: 'quark',
      productId: 'pro',
      versionId: '1.0.0',
    });
  });

  it('reads the gateways for the resolved country and sends no country of its own', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          country: 'CO',
          source: 'ip',
          systems: [{ id: 'paypal', name: 'PayPal', countries: null }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const systems = await gateway.listSystems();

    expect(lastCall().url).toBe(REGISTRY + '/gateway/systems');
    expect(lastCall().url).not.toContain('country');
    expect(systems).toEqual({
      country: 'CO',
      source: 'ip',
      systems: [{ id: 'paypal', name: 'PayPal', countries: null }],
    });
  });

  it('turns a missing systems body into an empty list instead of throwing', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('null', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(gateway.listSystems()).resolves.toEqual({
      country: null,
      source: 'unknown',
      systems: [],
    });
  });

  it('lists every subscription; the route has no system filter', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('[]', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(gateway.listSubscriptions()).resolves.toEqual([]);
    expect(lastCall().url).toBe(REGISTRY + '/subscriptions/me');
  });

  it('routes a plan link by its two segments', async () => {
    await gateway.createPaymentLink('paypal', {
      kind: 'plan',
      packageId: 'demo',
      productId: 'PL1',
    });

    expect(lastCall().url).toBe(REGISTRY + '/gateway/paypal/PL1/demo');
  });

  it('routes a certification link pinned to the version', async () => {
    await gateway.createPaymentLink('paypal', {
      kind: 'certification',
      packageId: 'demo',
      versionId: '1.0.0',
      productId: 'N2',
    });

    expect(lastCall().url).toBe(REGISTRY + '/gateway/paypal/N2/demo@1.0.0');
  });
});

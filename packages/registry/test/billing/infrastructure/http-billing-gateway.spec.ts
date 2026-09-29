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
 * The billing service does not exist yet. This suite is not a behavioural
 * contract with a backend: it pins the request shape the client produces today
 * so that whoever implements the service makes a deliberate choice between
 * `gatewayPath()` (path-scoped) and the flat paths with `system` in the body.
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
});

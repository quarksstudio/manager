import { loadConfig } from '@quarks.studio/config';

import { Client } from '../../src/composition/ambient-client';

jest.mock('@quarks.studio/use-storage/storage', () => ({
  createStorage: jest.fn(() => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('registry client', () => {
  it('exposes the typed operation groups', () => {
    const client = new Client('token');

    expect(typeof client.Packages.search).toBe('function');
    expect(typeof client.Packages.get).toBe('function');
    expect(typeof client.Packages.getReadme).toBe('function');
    expect(typeof client.Auth.me).toBe('function');
    expect(typeof client.Gateway.createSubscription).toBe('function');
  });

  it('sends client headers with a bearer token', () => {
    const client = new Client('token');
    const headers = (
      client as unknown as { _headers(): Record<string, string> }
    )._headers();

    expect(headers['Authorization']).toEqual('Bearer token');
    expect(headers['X-Client']).toEqual('Client');
  });

  it('encodes a scoped package name as one route segment', async () => {
    process.env['QUARK_REGISTRY_URL'] = 'https://registry.test/v1';
    // `Client.API` is a synchronous read, so resolve the configuration first.
    await loadConfig();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: '@scope/skill' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new Client();
    await (client.Packages as { get(name: string): Promise<unknown> }).get(
      '@scope/skill',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://registry.test/v1/package/%40scope%2Fskill',
      expect.any(Object),
    );
    fetchMock.mockRestore();
  });

  it('fetches the readme for a package version', async () => {
    process.env['QUARK_REGISTRY_URL'] = 'https://registry.test/v1';
    // `Client.API` is a synchronous read, so resolve the configuration first.
    await loadConfig();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: '# docs' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new Client();
    const readme = await (
      client.Packages as {
        getReadme(name: string, version: string): Promise<unknown>;
      }
    ).getReadme('@scope/skill', '1.0.0');
    expect(readme).toEqual({ content: '# docs' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://registry.test/v1/package/%40scope%2Fskill/1.0.0/readme',
      expect.any(Object),
    );
    fetchMock.mockRestore();
  });

  it('omits the authorization header without a token', () => {
    const client = new Client();
    const headers = (
      client as unknown as { _headers(): Record<string, string> }
    )._headers();

    expect(headers['Authorization']).toBeUndefined();
  });

  it('creates subscriptions through the selected gateway system', async () => {
    process.env['QUARK_REGISTRY_URL'] = 'https://registry.test/v1';
    // `Client.API` is a synchronous read, so resolve the configuration first.
    await loadConfig();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'sub_123' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new Client('token');

    await (
      client.Gateway as {
        createSubscription(
          system: string,
          input: {
            packageId: string;
            planId: string;
            role: 'author';
            paymentMethodId: string;
          },
          idempotencyKey: string,
        ): Promise<unknown>;
      }
    ).createSubscription(
      'mercadopago',
      {
        packageId: 'pkg_123',
        planId: 'plan_123',
        role: 'author',
        paymentMethodId: 'pm_123',
      },
      'request_123',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://registry.test/v1/subscriptions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get('Idempotency-Key')).toBe(
      'request_123',
    );
    expect(request.body).toBe(
      JSON.stringify({
        packageId: 'pkg_123',
        planId: 'plan_123',
        role: 'author',
        paymentMethodId: 'pm_123',
        system: 'mercadopago',
        productId: 'plan_123',
        paymentSourceId: 'pm_123',
      }),
    );
    fetchMock.mockRestore();
  });

  it('encodes gateway systems and subscription identifiers', async () => {
    process.env['QUARK_REGISTRY_URL'] = 'https://registry.test/v1';
    // `Client.API` is a synchronous read, so resolve the configuration first.
    await loadConfig();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'sub_123' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new Client();

    await (
      client.Gateway as {
        getSubscription(system: string, id: string): Promise<unknown>;
      }
    ).getSubscription('provider/test', 'sub/123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://registry.test/v1/subscriptions/sub%2F123',
      expect.any(Object),
    );
    fetchMock.mockRestore();
  });
});

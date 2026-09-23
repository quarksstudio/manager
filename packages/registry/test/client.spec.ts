import { createRegistryClient } from '../src/client';
describe('request scoped client', () => {
  it('isolates concurrent credentials and base URLs', async () => {
    const calls: Array<[string, string | null]> = [];
    const transport = jest.fn(async (url, init) => {
      calls.push([
        String(url),
        new Headers(init?.headers).get('Authorization'),
      ]);
      return new Response(JSON.stringify({ id: 'demo' }));
    }) as typeof fetch;
    await Promise.all(
      ['alice', 'bob'].map((token) =>
        createRegistryClient({
          baseUrl: `https://${token}.example/v1`,
          token,
          fetch: transport,
        }).Packages.get('@scope/demo'),
      ),
    );
    expect(calls).toEqual([
      ['https://alice.example/v1/package/%40scope%2Fdemo', 'Bearer alice'],
      ['https://bob.example/v1/package/%40scope%2Fdemo', 'Bearer bob'],
    ]);
  });
  it('does not inherit a previous user token', async () => {
    const transport = jest.fn(async (_url, init) => {
      expect(new Headers(init?.headers).has('Authorization')).toBe(false);
      return new Response('{}');
    }) as typeof fetch;
    await createRegistryClient({
      baseUrl: 'https://example.test/v1',
      fetch: transport,
    }).Packages.get('demo');
  });
  it('preserves HTTP errors and streams downloads', async () => {
    const failed = createRegistryClient({
      baseUrl: 'https://example.test',
      fetch: async () => new Response('', { status: 403 }),
    });
    await expect(failed.Packages.get('demo')).rejects.toMatchObject({
      status: 403,
      name: 'RegistryHttpError',
    });
    const response = new Response('archive');
    const client = createRegistryClient({
      baseUrl: 'https://example.test',
      fetch: async () => response,
    });
    expect(await client.Packages.downloadBundle('demo', '1.0.0')).toBe(
      response,
    );
  });
});

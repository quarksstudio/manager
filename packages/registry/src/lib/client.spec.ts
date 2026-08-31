import { Client } from './index';

jest.mock('@quark/use-storage', () => ({
  createStorage: jest.fn(() => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('registry client', () => {
  it('binds the Packages and Auth method groups', () => {
    const client = new Client('token');

    expect(typeof (client.Packages as Record<string, unknown>)['search']).toBe(
      'function',
    );
    expect(typeof (client.Packages as Record<string, unknown>)['get']).toBe(
      'function',
    );
    expect(typeof (client.Auth as Record<string, unknown>)['me']).toBe(
      'function',
    );
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
    Client.API = 'https://registry.test/v1';
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

  it('omits the authorization header without a token', () => {
    const client = new Client();
    const headers = (
      client as unknown as { _headers(): Record<string, string> }
    )._headers();

    expect(headers['Authorization']).toBeUndefined();
  });
});

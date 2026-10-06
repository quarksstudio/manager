import { createHttpContext } from '../src/http';

describe('request body encoding', () => {
  const fetchMock = jest.fn();
  const context = createHttpContext({
    baseUrl: 'http://registry.test/v1',
    fetch: fetchMock,
  });

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('{}'));
  });

  it.each([undefined, 'text/plain'])(
    'sends objects as JSON with content type %s',
    async (contentType) => {
      await context.fetchJson('example', {
        method: 'POST',
        body: { token: 'example' },
        headers: contentType ? { 'Content-Type': contentType } : undefined,
      });
      const options = fetchMock.mock.calls[0][1];
      expect(new Headers(options.headers).get('Content-Type')).toBe(
        'application/json',
      );
      expect(JSON.parse(options.body)).toEqual({ token: 'example' });
    },
  );

  it.each([undefined, ''])(
    'rejects strings without a content type before fetching (%s)',
    async (contentType) => {
      await expect(
        context.request('example', {
          method: 'POST',
          body: '{"token":"example"}',
          headers:
            contentType === undefined
              ? undefined
              : { 'Content-Type': contentType },
        }),
      ).rejects.toThrow(
        'String request bodies require an explicit Content-Type',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('preserves explicitly typed strings', async () => {
    const body = '{"token":"example"}';
    await context.request('example', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    });
    expect(fetchMock.mock.calls[0][1].body).toBe(body);
    expect(
      new Headers(fetchMock.mock.calls[0][1].headers).get('Content-Type'),
    ).toBe('application/json');
  });

  it('lets fetch encode FormData and its multipart boundary', async () => {
    const body = new FormData();
    body.append('name', 'example');
    await context.request('example', { method: 'POST', body });
    expect(fetchMock.mock.calls[0][1].body).toBe(body);
    expect(
      new Headers(fetchMock.mock.calls[0][1].headers).has('Content-Type'),
    ).toBe(false);
  });

  it('keeps requests without bodies empty', async () => {
    await context.request('example', { method: 'POST' });
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    expect(
      new Headers(fetchMock.mock.calls[0][1].headers).has('Content-Type'),
    ).toBe(false);
  });
});

describe('M03: registry credential origin boundary', () => {
  let fetchMock: jest.Mock;
  let unauthorized: jest.Mock;
  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(new Response('{}'));
    unauthorized = jest.fn();
  });
  const context = () =>
    createHttpContext({
      baseUrl: 'https://registry.example.test/v1',
      token: 'synthetic-token',
      fetch: fetchMock,
      onUnauthorized: unauthorized,
    });
  it.each([
    'https://unrelated.example.test/bundle',
    '//unrelated.example.test/bundle',
    'http://registry.example.test/v1',
    'https://registry.example.test:444/bundle',
    'https://registry.example.test.evil.test/bundle',
    'https://user:password@registry.example.test/v1',
    'data:text/plain,fixture',
    'https:\\unrelated.example.test\\bundle',
  ])('rejects %s before sending credentials', async (url) => {
    await expect(
      context().request(url, { headers: { Authorization: 'explicit-token' } }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(unauthorized).not.toHaveBeenCalled();
  });
  it.each([
    'packages/demo',
    '/v1/packages/demo',
    'https://registry.example.test/v1/packages/demo',
  ])('preserves auth for same-origin %s', async (url) => {
    await context().request(url);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://registry.example.test/v1/packages/demo',
      expect.objectContaining({ redirect: 'error' }),
    );
    expect(
      new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization'),
    ).toBe('Bearer synthetic-token');
  });
  it('does not invalidate registry auth on a rejected redirect', async () => {
    fetchMock.mockRejectedValue(new TypeError('redirect rejected'));
    await expect(context().request('bundle')).rejects.toThrow(
      'redirect rejected',
    );
    expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
    expect(unauthorized).not.toHaveBeenCalled();
  });
  it('continues to invalidate registry auth on a same-origin 401', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(context().request('identity')).rejects.toThrow();
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });
});

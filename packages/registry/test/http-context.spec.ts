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

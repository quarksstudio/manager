import { createHttpPackageSearch } from '../../src/http';
import type { OperationContext } from '@quarks.studio/registry/http';

const fetchJson = jest.fn();

const context = { fetchJson } as unknown as OperationContext;
const remote = createHttpPackageSearch(context);

/** The query string the adapter built, parsed so assertions read as pairs. */
function requestedQuery(): URLSearchParams {
  const [target] = fetchJson.mock.calls[0] as [string];
  return new URLSearchParams(target.slice(target.indexOf('?') + 1));
}

function page(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    items: [
      {
        name: 'chat',
        summary: 'Chat assistant',
        tags: ['ai'],
        latestVersion: '1.2.0',
      },
    ],
    totalCount: 1,
    nextCursor: null,
    ...overrides,
  };
}

describe('the HTTP package search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries the package collection and sends the filters as parameters', async () => {
    fetchJson.mockResolvedValue(page());

    await remote.search(
      { query: '  chat  ', name: 'chat', summary: 'assistant' },
      { matchMode: 'all', exact: true },
      'cursor-2',
    );

    const [target, options] = fetchJson.mock.calls[0] as [string, unknown];
    expect(target.startsWith('package?')).toBe(true);
    // Blank filters are dropped rather than sent as empty parameters.
    expect(requestedQuery()).toEqual(
      new URLSearchParams({
        query: 'chat',
        name: 'chat',
        summary: 'assistant',
        matchMode: 'all',
        exact: 'true',
        cursor: 'cursor-2',
      }),
    );
    expect(options).toBeUndefined();
  });

  it('defaults the match mode and omits an empty cursor', async () => {
    fetchJson.mockResolvedValue(page());

    await remote.search({}, {});

    const query = requestedQuery();
    expect(query.get('matchMode')).toBe('any');
    expect(query.get('exact')).toBe('false');
    expect(query.has('cursor')).toBe(false);
    expect(query.has('query')).toBe(false);
  });

  it('flattens the wire shape into a name and a version', async () => {
    fetchJson.mockResolvedValue(page());

    await expect(remote.search({}, {})).resolves.toEqual({
      items: [
        {
          name: 'chat',
          version: '1.2.0',
          summary: 'Chat assistant',
          tags: ['ai'],
        },
      ],
      totalCount: 1,
      nextCursor: null,
    });
  });

  it('uses the package name and drops an entry that is not a package', async () => {
    fetchJson.mockResolvedValue(
      page({
        items: [
          { name: 'by-id', latestVersion: '1.0.0' },
          { name: 'no-version', latestVersion: null },
          { name: 'no-latest' },
        ],
      }),
    );

    const result = await remote.search({}, {});

    expect(result.items).toEqual([
      { name: 'by-id', version: '1.0.0', summary: '', tags: undefined },
    ]);
  });

  it('carries the cursor through so a page can be followed', async () => {
    fetchJson.mockResolvedValue(page({ nextCursor: 'next-page' }));

    await expect(remote.search({}, {}, 'cursor-1')).resolves.toMatchObject({
      nextCursor: 'next-page',
    });
    expect(requestedQuery().get('cursor')).toBe('cursor-1');
  });
});

it('sends the exact author, page size and cursor', async () => {
  fetchJson.mockClear();
  fetchJson.mockResolvedValue(page());
  await remote.search({ author: 'User/id +?' }, { limit: 24 }, 'next+cursor');
  expect(requestedQuery().get('author')).toBe('User/id +?');
  expect(requestedQuery().get('limit')).toBe('24');
  expect(requestedQuery().get('cursor')).toBe('next+cursor');
});

it('forwards URL parameters intact and maps the response with the existing adapter', async () => {
  fetchJson.mockClear();
  fetchJson.mockResolvedValue(page());
  const params = new URLSearchParams(
    'query=+Demo+&tags=AI&tags=chat&cursor=%2Bnext',
  );
  await expect(remote.searchParams(params)).resolves.toMatchObject({
    totalCount: 1,
    items: [{ name: 'chat', version: '1.2.0' }],
  });
  expect(fetchJson).toHaveBeenCalledWith(
    'package?query=+Demo+&tags=AI&tags=chat&cursor=%2Bnext',
  );
  expect(params.getAll('tags')).toEqual(['AI', 'chat']);
});

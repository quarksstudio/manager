import { createHttpPackageSearch } from '../../../src/catalog/infrastructure/http-package-search';
import type { OperationContext } from '../../../src/transport/http-context';

const fetchJson = jest.fn();

const context = { fetchJson } as unknown as OperationContext;
const remote = createHttpPackageSearch(context);

/** The query string the adapter built, parsed so assertions read as pairs. */
function requestedQuery(): URLSearchParams {
  const [target] = fetchJson.mock.calls[0] as [string];
  return new URLSearchParams(target.slice(target.indexOf('?') + 1));
}

function page(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    items: [
      {
        id: 'chat',
        description: 'Chat assistant',
        tags: ['ai'],
        latest: { version: '1.2.0' },
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
      { query: '  chat  ', name: 'chat', description: 'assistant' },
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
        description: 'assistant',
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
        { name: 'chat', version: '1.2.0', description: 'Chat assistant', tags: ['ai'] },
      ],
      totalCount: 1,
      nextCursor: null,
    });
  });

  it('falls back to the id and drops an entry that is not a package', async () => {
    fetchJson.mockResolvedValue(
      page({
        items: [
          { id: 'by-id', latest: { version: '1.0.0' } },
          { id: 'no-version', latest: null },
          { name: 'no-latest' },
        ],
      }),
    );

    const result = await remote.search({}, {});

    expect(result.items).toEqual([
      { name: 'by-id', version: '1.0.0', description: '', tags: undefined },
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

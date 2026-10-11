import { resolveSearchRequest } from '../../src/CLI/search-options';
import { createHttpPackageSearch } from '../../src/infrastructure/http-package-search';
import type { OperationContext } from '@quarks.studio/registry/http';

it('resolves positional text and both aliases with the documented priority', () => {
  expect(resolveSearchRequest('positional').filters.query).toBe('positional');
  expect(
    resolveSearchRequest('positional', { search: 'alias' }).filters.query,
  ).toBe('alias');
  expect(
    resolveSearchRequest('positional', { query: 'primary', search: 'alias' })
      .filters.query,
  ).toBe('primary');
  expect(resolveSearchRequest().options).toEqual({
    matchMode: 'any',
    exact: false,
    limit: undefined,
  });
});
it.each([true, 'true', false, 'false'])('parses --exact %s', (exact) => {
  expect(resolveSearchRequest(undefined, { exact }).options.exact).toBe(
    exact === true || exact === 'true',
  );
});
it.each([
  { exact: 'yes' },
  { matchMode: 'either' },
  { limit: '0' },
  { limit: '-1' },
  { limit: '1.5' },
  { limit: 'NaN' },
  { limit: 'Infinity' },
  { limit: '9007199254740992' },
])('rejects invalid CLI options %p', (options) => {
  expect(() => resolveSearchRequest(undefined, options)).toThrow();
});
it('sends all filters, page size and cursor to the HTTP adapter', async () => {
  const fetchJson = jest
    .fn()
    .mockResolvedValue({ items: [], totalCount: 0, nextCursor: null });
  const remote = createHttpPackageSearch({
    fetchJson,
  } as unknown as OperationContext);
  const request = resolveSearchRequest(undefined, {
    search: 'E2E test',
    author: 'uid+id',
    name: 'demo',
    summary: 'test skill',
    tags: ' e2e, testing, ',
    matchMode: 'all',
    exact: 'false',
    limit: '10',
    cursor: 'cursor+id',
  });
  await remote.search(request.filters, request.options, request.cursor);
  const params = new URLSearchParams(fetchJson.mock.calls[0][0].split('?')[1]);
  expect(Object.fromEntries(params)).toEqual({
    query: 'E2E test',
    author: 'uid+id',
    name: 'demo',
    summary: 'test skill',
    tags: 'e2e,testing',
    matchMode: 'all',
    exact: 'false',
    limit: '10',
    cursor: 'cursor+id',
  });
});
it('allows filters without text and keeps models out of the request', () => {
  const request = resolveSearchRequest(undefined, {
    tags: 'e2e',
    models: 'openai',
    limit: '200',
  });
  expect(request.filters.query).toBeUndefined();
  expect(request.filters.tags).toEqual(['e2e']);
  expect(request.options.limit).toBe(200);
  expect(request.filters).not.toHaveProperty('models');
});

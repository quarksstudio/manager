import { packageSearchParams } from '../../src/domain/search-params';
it('does not activate searches for unrelated parameters', () => {
  expect(
    packageSearchParams(new URLSearchParams('utm_source=blog')).active,
  ).toBe(false);
});
it.each([
  'query=',
  'name=demo',
  'description=Hello',
  'author=uid',
  'tags=AI',
  'limit=20',
  'cursor=next',
  'exact=true',
  'matchMode=any',
  'search=demo',
])('recognizes a search parameter (%s)', (input) => {
  expect(packageSearchParams(new URLSearchParams(input)).active).toBe(true);
});
it('preserves recognized values and repeated tags without adding defaults', () => {
  const query =
    'query=+Demo+&tags=AI&tags=chat&exact=false&cursor=%2Bnext&limit=1';
  expect(
    packageSearchParams(
      new URLSearchParams(query + '&tracking=ignored'),
    ).params.toString(),
  ).toBe(query);
});
it('maps the legacy q alias only when no backend text parameter exists', () => {
  expect(
    packageSearchParams(new URLSearchParams('q=demo')).params.toString(),
  ).toBe('query=demo');
  expect(
    packageSearchParams(new URLSearchParams('query=&q=demo')).params.toString(),
  ).toBe('query=');
  expect(
    packageSearchParams(
      new URLSearchParams('search=chosen&q=demo'),
    ).params.toString(),
  ).toBe('search=chosen');
});

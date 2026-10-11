const searchKeys = new Set([
  'query',
  'search',
  'name',
  'summary',
  'author',
  'tags',
  'matchMode',
  'exact',
  'limit',
  'cursor',
]);
/** Keep backend parameters intact, including repeated tags and empty searches. */
export function packageSearchParams(input: URLSearchParams): {
  active: boolean;
  params: URLSearchParams;
} {
  const params = new URLSearchParams();
  for (const [key, value] of input)
    if (searchKeys.has(key)) params.append(key, value);
  if (!params.has('query') && !params.has('search') && input.has('q'))
    params.set('query', input.get('q') ?? '');
  return { active: [...params.keys()].length > 0, params };
}

import type {
  SearchFilters,
  SearchOptions,
} from '../domain/package-search-item';

export interface SearchCliOptions {
  query?: string;
  search?: string;
  author?: string;
  name?: string;
  summary?: string;
  tags?: string;
  matchMode?: string;
  exact?: boolean | string;
  limit?: string;
  cursor?: string;
  models?: string;
}

export function resolveSearchRequest(
  skill?: string,
  cli: SearchCliOptions = {},
): {
  filters: SearchFilters;
  options: SearchOptions;
  cursor?: string;
} {
  const matchMode = cli.matchMode ?? 'any';
  if (matchMode !== 'any' && matchMode !== 'all')
    throw new Error('--match-mode must be any or all');
  const exact = cli.exact ?? false;
  if (![true, false, 'true', 'false'].includes(exact))
    throw new Error('--exact must be true or false');
  const limit = cli.limit === undefined ? undefined : Number(cli.limit);
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1))
    throw new Error('--limit must be a positive integer');
  return {
    filters: {
      query: cli.query ?? cli.search ?? skill,
      author: cli.author,
      name: cli.name,
      summary: cli.summary,
      tags: cli.tags
        ?.split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    },
    options: { matchMode, exact: exact === true || exact === 'true', limit },
    cursor: cli.cursor,
  };
}

import type { OperationContext } from '@quarks.studio/registry/http';
import type {
  PackageSearchItem,
  RemoteSearchPage,
  SearchFilters,
  SearchOptions,
} from '../domain/package-search-item';
import type { PackageSearchRemote } from '../application/package-catalog.repository';

interface ServerPackage {
  id?: string;
  name?: string;
  description?: string;
  tags?: string[];
  latest?: { version?: string } | null;
  [key: string]: unknown;
}

interface ServerSearchPage {
  items: ServerPackage[];
  totalCount: number;
  nextCursor: string | null;
}

/** The registry's `package` collection, queried with the search parameters. */
export function createHttpPackageSearch(
  context: OperationContext,
): PackageSearchRemote & {
  searchParams(params: URLSearchParams): Promise<RemoteSearchPage>;
} {
  async function searchParams(
    params: URLSearchParams,
  ): Promise<RemoteSearchPage> {
    const page = await context.fetchJson<ServerSearchPage>(
      `package?${params.toString()}`,
    );
    return {
      items: page.items.map(toSearchItem).filter(isSearchItem),
      totalCount: page.totalCount,
      nextCursor: page.nextCursor,
    };
  }
  return {
    searchParams,
    async search(
      filters: SearchFilters,
      options: SearchOptions,
      cursor?: string,
    ): Promise<RemoteSearchPage> {
      const query = new URLSearchParams();
      if (filters.author !== undefined) query.set('author', filters.author);
      if (options.limit !== undefined)
        query.set('limit', String(options.limit));
      append(query, 'query', filters.query);
      append(query, 'name', filters.name);
      append(query, 'description', filters.description);
      if (filters.tags?.length) query.set('tags', filters.tags.join(','));
      query.set('matchMode', options.matchMode ?? 'any');
      query.set('exact', String(options.exact ?? false));
      if (cursor) query.set('cursor', cursor);
      return searchParams(query);
    },
  };
}

/**
 * The wire shape carries an `id` and a nested `latest`; the catalog wants a
 * name and a version. An entry without both is not a package and is dropped.
 */
function toSearchItem(item: ServerPackage): PackageSearchItem | null {
  const name = item.name ?? item.id;
  const version = item.latest?.version;
  if (!name || !version) return null;
  const additional = { ...item };
  delete additional.id;
  delete additional.latest;
  return {
    ...additional,
    name,
    version,
    description: item.description ?? '',
    tags: item.tags,
  };
}

function isSearchItem(
  item: PackageSearchItem | null,
): item is PackageSearchItem {
  return item !== null;
}

function append(params: URLSearchParams, key: string, value?: string): void {
  if (value?.trim()) params.set(key, value.trim());
}

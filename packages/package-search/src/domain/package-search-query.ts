import type {
  PackageSearchItem,
  SearchFilters,
  SearchOptions,
} from './package-search-item';

/**
 * Matching and ranking over an in-memory catalog. Pure: the same filters and
 * options always produce the same list, so it can be reasoned about — and
 * tested — without a registry.
 */
export function filterPackages(
  packages: PackageSearchItem[],
  filters: SearchFilters,
  options: SearchOptions = {},
): PackageSearchItem[] {
  const matches = (value: string, expected?: string): boolean => {
    if (!expected?.trim()) return true;
    const normalizedValue = value.toLowerCase();
    const normalizedExpected = expected.trim().toLowerCase();
    return options.exact
      ? normalizedValue === normalizedExpected
      : normalizedValue.includes(normalizedExpected);
  };
  return packages
    .filter((item) => {
      if (!matches(item.name, filters.name)) return false;
      if (!matches(item.summary, filters.summary)) return false;
      const tags = item.tags ?? [];
      if (filters.tags?.length) {
        const checks = filters.tags.map((tag) =>
          tags.some((value) => matches(value, tag)),
        );
        if (
          (options.matchMode ?? 'any') === 'all'
            ? !checks.every(Boolean)
            : !checks.some(Boolean)
        ) {
          return false;
        }
      }
      return (
        !filters.query?.trim() ||
        [item.name, item.summary, ...tags].some((value) =>
          matches(value, filters.query),
        )
      );
    })
    .sort((a, b) => {
      const score = relevance(b, filters) - relevance(a, filters);
      return (
        score ||
        a.name.localeCompare(b.name) ||
        b.version.localeCompare(a.version)
      );
    });
}

/** An exact name beats a prefix, which beats a match anywhere. */
function relevance(item: PackageSearchItem, filters: SearchFilters): number {
  const query = filters.query?.trim().toLowerCase();
  if (!query) return 0;
  if (item.name.toLowerCase() === query) return 3;
  if (item.name.toLowerCase().startsWith(query)) return 2;
  return 1;
}

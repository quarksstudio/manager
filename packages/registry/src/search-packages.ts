import { createStorage } from '@quark/use-storage';

import { apiFetch } from './lib/api-fetch';
import { Client } from './lib';

export interface PackageSearchItem {
  name: string;
  version: string;
  description: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface SearchFilters {
  name?: string;
  description?: string;
  tags?: string[];
  query?: string;
}

export interface SearchOptions {
  matchMode?: 'any' | 'all';
  exact?: boolean;
  limitLocal?: number;
}

export interface RemoteSearchPage {
  items: PackageSearchItem[];
  totalCount: number;
  nextCursor: string | null;
}

export interface HybridSearchResult {
  localResults: PackageSearchItem[];
  remote: Promise<RemoteSearchPage>;
}

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

export const CATALOG_KEY = 'packages';
let memoryCatalog: Record<string, PackageSearchItem> | null = null;
let catalogPromise: Promise<Record<string, PackageSearchItem>> | null = null;

export async function searchPackages(
  filters: SearchFilters = {},
  options: SearchOptions = {},
): Promise<HybridSearchResult> {
  const localCatalog = loadCatalog();
  const remote = fetchRemotePackages(filters, options);
  const catalog = await localCatalog;
  const localResults = filterPackages(Object.values(catalog), filters, options);
  const limit = options.limitLocal;
  const visibleLocal =
    typeof limit === 'number' && limit >= 0
      ? localResults.slice(0, limit)
      : localResults;
  return {
    localResults: visibleLocal,
    remote,
  };
}

export async function fetchRemotePackages(
  filters: SearchFilters,
  options: SearchOptions,
  cursor?: string,
): Promise<RemoteSearchPage> {
  const query = new URLSearchParams();
  append(query, 'query', filters.query);
  append(query, 'name', filters.name);
  append(query, 'description', filters.description);
  if (filters.tags?.length) query.set('tags', filters.tags.join(','));
  query.set('matchMode', options.matchMode ?? 'any');
  query.set('exact', String(options.exact ?? false));
  if (cursor) query.set('cursor', cursor);
  const base = Client.API.replace(/\/$/, '');
  const page = await apiFetch<ServerSearchPage>(`${base}/package?${query}`);
  const items = page.items.map(normalizeServerPackage).filter(isSearchItem);
  await upsertCatalog(items);
  return {
    items,
    totalCount: page.totalCount,
    nextCursor: page.nextCursor,
  };
}

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
      if (!matches(item.description, filters.description)) return false;
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
        [item.name, item.description, ...tags].some((value) =>
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

async function loadCatalog(): Promise<Record<string, PackageSearchItem>> {
  if (memoryCatalog) return memoryCatalog;
  if (catalogPromise) return catalogPromise;
  catalogPromise = createStorage({ namespace: 'package-catalog' })
    .getItem<Record<string, PackageSearchItem>>(CATALOG_KEY)
    .then((catalog) => {
      memoryCatalog = catalog ?? {};
      return memoryCatalog;
    });
  return catalogPromise;
}

async function upsertCatalog(items: PackageSearchItem[]): Promise<void> {
  const catalog = { ...(await loadCatalog()) };
  for (const item of items) catalog[item.name] = item;
  memoryCatalog = catalog;
  await createStorage({ namespace: 'package-catalog' }).setItem(
    CATALOG_KEY,
    catalog,
  );
}

function normalizeServerPackage(item: ServerPackage): PackageSearchItem | null {
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

function relevance(item: PackageSearchItem, filters: SearchFilters): number {
  const query = filters.query?.trim().toLowerCase();
  if (!query) return 0;
  if (item.name.toLowerCase() === query) return 3;
  if (item.name.toLowerCase().startsWith(query)) return 2;
  return 1;
}

function append(params: URLSearchParams, key: string, value?: string): void {
  if (value?.trim()) params.set(key, value.trim());
}

export function resetPackageCatalogMemory(): void {
  memoryCatalog = null;
  catalogPromise = null;
}

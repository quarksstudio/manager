import { createContext, createElement, type ReactNode } from 'react';
import type {
  HybridSearchResult,
  RemoteSearchPage,
  SearchFilters,
  SearchOptions,
  PackageSearchItem,
} from '../domain/package-search-item';
export interface PackageSearchServices {
  searchPackages(
    filters: SearchFilters,
    options?: SearchOptions,
  ): Promise<HybridSearchResult>;
  fetchRemotePackages(
    filters: SearchFilters,
    options: SearchOptions,
    cursor?: string,
  ): Promise<RemoteSearchPage>;
}
export const ServicesContext = createContext<PackageSearchServices | null>(
  null,
);
export function PackageSearchProvider({
  services,
  children,
}: {
  services: PackageSearchServices;
  children: ReactNode;
}) {
  return createElement(ServicesContext.Provider, { value: services }, children);
}
export interface UseSearchPackagesReturn {
  search: (filters: SearchFilters, options?: SearchOptions) => Promise<void>;
  loadRemoteResults: () => Promise<void>;
  localResults: PackageSearchItem[];
  remoteResults: PackageSearchItem[];
  combinedResults: PackageSearchItem[];
  isSearchingRemote: boolean;
  searchError: string | null;
  hasMoreRemoteResults: boolean;
  totalCount: number;
  reset: () => void;
}
export function mergeUnique(
  first: PackageSearchItem[],
  second: PackageSearchItem[],
): PackageSearchItem[] {
  const packages = new Map(first.map((item) => [item.name, item]));
  for (const item of second) packages.set(item.name, item);
  return [...packages.values()];
}

// The headless subpath, not the barrel: the barrel re-exports the React hook.
import { createStorage } from '@quarks.studio/use-storage/storage';

import type { PackageSearchItem } from '../domain/package-search-item';
import type { PackageCatalogRepository } from '../application/package-catalog.repository';

export const CATALOG_KEY = 'packages';
const CATALOG_NAMESPACE = 'package-catalog';

let memoryCatalog: Record<string, PackageSearchItem> | null = null;
let catalogPromise: Promise<Record<string, PackageSearchItem>> | null = null;

/**
 * The catalog persists because it is what makes a search instant on the next
 * call, and it is kept in memory as well so a second search in the same process
 * never touches storage.
 */
export function createStoragePackageCatalog(): PackageCatalogRepository {
  const storage = () => createStorage({ namespace: CATALOG_NAMESPACE });

  function load(): Promise<Record<string, PackageSearchItem>> {
    if (memoryCatalog) return Promise.resolve(memoryCatalog);
    if (catalogPromise) return catalogPromise;
    catalogPromise = storage()
      .getItem<Record<string, PackageSearchItem>>(CATALOG_KEY)
      .then((catalog) => {
        memoryCatalog = catalog ?? {};
        return memoryCatalog;
      });
    return catalogPromise;
  }

  return {
    load,

    async upsert(items: PackageSearchItem[]) {
      const catalog = { ...(await load()) };
      for (const item of items) catalog[item.name] = item;
      memoryCatalog = catalog;
      await storage().setItem(CATALOG_KEY, catalog);
    },

    reset() {
      memoryCatalog = null;
      catalogPromise = null;
    },
  };
}

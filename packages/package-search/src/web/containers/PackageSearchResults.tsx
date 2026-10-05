import {
  usePackageSearchResults,
  type PackageResultsServices,
} from '../../hooks/usePackageSearchResults';
import { UserPackageGrid } from '../components/UserPackageGrid';

export function PackageSearchResults({
  searchParams,
  services,
  packageUrl,
}: {
  searchParams: string;
  services: PackageResultsServices;
  packageUrl: (name: string) => string;
}) {
  const { page, loading, error, unsupported, load } = usePackageSearchResults(
    searchParams,
    services,
  );
  return (
    <main
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12"
      aria-busy={loading}
    >
      <h1 className="mb-3 text-2xl font-semibold">Search packages</h1>
      {page && (
        <p className="mb-6 text-slate-400">
          {page.totalCount} {page.totalCount === 1 ? 'package' : 'packages'}
        </p>
      )}
      {page && <UserPackageGrid items={page.items} packageUrl={packageUrl} />}
      {page?.items.length === 0 && <p>No packages found.</p>}
      {loading && (
        <p role="status" className="mt-6">
          Loading packages…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 text-sm text-red-400">
          {error}
        </p>
      )}
      {!loading && !unsupported && (error || page?.nextCursor) && (
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded border border-slate-700 px-4 py-2"
        >
          {error ? 'Retry' : 'Load more'}
        </button>
      )}
    </main>
  );
}

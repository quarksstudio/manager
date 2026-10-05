import { useMemo } from 'react';
import { QuarkTheme } from '@quarks.studio/web-ui';
import { createConfiguredContext } from '@quarks.studio/config/http';
import { createHttpPackageSearch } from '../../infrastructure/http-package-search';
import { packageUrl } from '../lib/package-links';
import { PackageSearchResults } from '../containers/PackageSearchResults';

export function ConfiguredPackageSearchResults({
  searchParams,
  apiBaseUrl,
}: {
  searchParams: string;
  apiBaseUrl: string;
}) {
  const services = useMemo(
    () => createHttpPackageSearch(createConfiguredContext(apiBaseUrl)),
    [apiBaseUrl],
  );
  return (
    <QuarkTheme>
      <PackageSearchResults
        searchParams={searchParams}
        services={services}
        packageUrl={packageUrl}
      />
    </QuarkTheme>
  );
}

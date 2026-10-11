import { createPackageSearchServices } from '../presentation/configured-services';
import React from 'react';
import { renderAction } from '@quarks.studio/terminal-ui';
import {
  PackageSearchProvider,
  type PackageSearchServices,
} from '../presentation';
import SearchScreen from './SearchScreen';
import { resolveSearchRequest, type SearchCliOptions } from './search-options';
export default function Search(
  skill?: string,
  options: SearchCliOptions = {},
): void {
  try {
    const request = resolveSearchRequest(skill, options);
    const services: PackageSearchServices = createPackageSearchServices();
    renderAction(
      React.createElement(PackageSearchProvider, {
        services,
        children: React.createElement(SearchScreen, request),
      }),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

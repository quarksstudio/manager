import { createPackageSearchServices } from '../presentation/configured-services';
import React from 'react';
import { renderAction } from '@quarks.studio/terminal-ui';
import { PackageSearchProvider, type PackageSearchServices } from '../presentation';
import SearchScreen from './SearchScreen';
export default function Search(
  query: string,
  services: PackageSearchServices = createPackageSearchServices(),
): void {
  renderAction(
    React.createElement(PackageSearchProvider, {
      services,
      children: React.createElement(SearchScreen, { query }),
    }),
  );
}

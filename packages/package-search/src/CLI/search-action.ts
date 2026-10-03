import React from 'react';
import { renderAction } from '@quarks.studio/terminal-ui';
import { PackageSearchProvider, type PackageSearchServices } from '../react';
import SearchScreen from './SearchScreen';
export default function Search(
  query: string,
  services: PackageSearchServices,
): void {
  renderAction(
    React.createElement(PackageSearchProvider, {
      services,
      children: React.createElement(SearchScreen, { query }),
    }),
  );
}

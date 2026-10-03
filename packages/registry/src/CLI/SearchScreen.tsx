import React from 'react';
import { SearchScreen as Screen } from '@quarks.studio/package-search/CLI';
import { RegistryProvider } from '../react';
export function SearchScreen(props: React.ComponentProps<typeof Screen>) {
  return React.createElement(RegistryProvider, {
    children: React.createElement(Screen, props),
  });
}
export default SearchScreen;

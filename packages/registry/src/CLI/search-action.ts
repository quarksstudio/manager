import React from 'react';

import { renderAction } from '@quarks.studio/ui/CLI';
import SearchScreen from './SearchScreen';

export default function Search(query: string): void {
  renderAction(React.createElement(SearchScreen, { query }));
}

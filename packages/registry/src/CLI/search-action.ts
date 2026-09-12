import React from 'react';

import { renderAction } from '@quark/ui/CLI';
import SearchScreen from './SearchScreen';

export default function Search(query: string): void {
  renderAction(React.createElement(SearchScreen, { query }));
}

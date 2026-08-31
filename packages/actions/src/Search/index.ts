import React from 'react';
import { render } from 'ink';
import SearchCompoment from './SearchCompoment';

export default function Search(query: string): void {
  render(React.createElement(SearchCompoment, { query }));
}

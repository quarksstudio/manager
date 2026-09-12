import React from 'react';

import { renderAction } from '@quark/ui/CLI';
import { CacheListScreen } from './CacheListScreen';
import { CacheVerifyScreen } from './CacheVerifyScreen';
import { CacheCleanScreen } from './CacheCleanScreen';

export function List(options?: { json?: boolean }): void {
  renderAction(React.createElement(CacheListScreen, options));
}

export function Verify(options?: { json?: boolean }): void {
  renderAction(React.createElement(CacheVerifyScreen, options));
}

export function Clean(): void {
  renderAction(React.createElement(CacheCleanScreen));
}

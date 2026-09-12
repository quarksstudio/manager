import React from 'react';

import { renderAction } from '@quark/ui/CLI';
import { AddScreen } from './AddScreen';
import { InstallScreen } from './InstallScreen';

export default function Add(
  name: string | string[] = [],
  options: Record<string, unknown> = {},
): void {
  if (name.length) {
    renderAction(
      React.createElement(AddScreen, {
        packageName: typeof name === 'string' ? [name] : name,
        where: options['where'] as string,
        models: (options['models'] as string)
          ? (options['models'] as string)
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
        isSave: options['isSave'] as boolean | undefined,
      }),
    );
  } else {
    renderAction(
      React.createElement(InstallScreen, {
        where: options['where'] as string,
        models: (options['models'] as string)
          ? (options['models'] as string)
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
      }),
    );
  }
}

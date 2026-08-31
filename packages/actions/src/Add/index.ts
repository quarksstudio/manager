import React from 'react';
import { render } from 'ink';

import AddPackages from './AddCompoment';
import InstallPackages from './InstallCompoment';

export default function Add(
  name: string[] = [],
  options: Record<string, unknown>,
): void {
  if (name.length) {
    render(
      React.createElement(AddPackages, {
        packageName: name,
        ...options,
      } as any),
    );
  } else {
    render(
      React.createElement(InstallPackages, {
        ...options,
      } as any),
    );
  }
}

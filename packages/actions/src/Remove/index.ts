import React from 'react';
import { render } from 'ink';
import RemovePackage from './RemoveCompoment';

export default function Remove(name: string, where: string): void {
  render(React.createElement(RemovePackage, { packageName: name, where }));
}

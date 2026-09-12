import React from 'react';

import { renderAction } from '@quark/ui/CLI';
import RemoveScreen from './RemoveScreen';

export default function Remove(name: string, where: string): void {
  renderAction(React.createElement(RemoveScreen, { packageName: name, where }));
}

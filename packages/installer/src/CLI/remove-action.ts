import React from 'react';

import { renderAction } from '@quarks.studio/ui/CLI';
import RemoveScreen from './RemoveScreen';

export default function Remove(name: string, where: string): void {
  renderAction(React.createElement(RemoveScreen, { packageName: name, where }));
}

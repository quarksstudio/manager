import React from 'react';

import { renderAction } from '@quark/ui/CLI';
import InfoScreen from './InfoScreen';

export default function Info(name: string): void {
  renderAction(React.createElement(InfoScreen, { name }));
}

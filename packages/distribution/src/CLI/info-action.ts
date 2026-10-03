import React from 'react';
import { renderAction } from '@quarks.studio/terminal-ui';
import { DistributionProvider, type DistributionServices } from '../react';
import InfoScreen from './InfoScreen';
export default function Info(
  name: string,
  services: DistributionServices,
): void {
  renderAction(
    React.createElement(DistributionProvider, {
      services,
      children: React.createElement(InfoScreen, { name }),
    }),
  );
}

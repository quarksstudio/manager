import { createDistributionServices } from '../presentation/configured-services';
import React from 'react';
import { renderAction } from '@quarks.studio/terminal-ui';
import {
  DistributionProvider,
  type DistributionServices,
} from '../presentation';
import InfoScreen from './InfoScreen';
export default function Info(
  name: string,
  services: DistributionServices = createDistributionServices(),
): void {
  renderAction(
    React.createElement(DistributionProvider, {
      services,
      children: React.createElement(InfoScreen, { name }),
    }),
  );
}

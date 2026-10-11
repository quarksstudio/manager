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
): void {
  const services: DistributionServices = createDistributionServices();
  renderAction(
    React.createElement(DistributionProvider, {
      services,
      children: React.createElement(InfoScreen, { name }),
    }),
  );
}

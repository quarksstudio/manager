import React from 'react';
import { InfoScreen as Screen } from '@quarks.studio/distribution/CLI';
import { RegistryProvider } from '../react';
export function InfoScreen(props: React.ComponentProps<typeof Screen>) {
  return React.createElement(RegistryProvider, {
    children: React.createElement(Screen, props),
  });
}
export default InfoScreen;

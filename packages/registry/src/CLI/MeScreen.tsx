import React from 'react';
import { MeScreen as Screen } from '@quarks.studio/identity/CLI';
import { RegistryProvider } from '../react';
export function MeScreen() {
  return React.createElement(RegistryProvider, {
    children: React.createElement(Screen),
  });
}
export default MeScreen;

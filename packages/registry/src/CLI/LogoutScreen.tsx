import React from 'react';
import { LogoutScreen as Screen } from '@quarks.studio/identity/CLI';
import { RegistryProvider } from '../react';
export function LogoutScreen() {
  return React.createElement(RegistryProvider, {
    children: React.createElement(Screen),
  });
}
export default LogoutScreen;

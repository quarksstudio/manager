import React from 'react';
import { LoginScreen as Screen } from '@quarks.studio/identity/CLI';
import { RegistryProvider } from '../react';
export function LoginScreen(props: React.ComponentProps<typeof Screen>) {
  return React.createElement(RegistryProvider, {
    children: React.createElement(Screen, props),
  });
}
export default LoginScreen;

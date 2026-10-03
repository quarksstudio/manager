import React from 'react';
import { renderAction } from '@quarks.studio/terminal-ui';
import { IdentityProvider, type IdentityServices } from '../react';
import LoginScreen from './LoginScreen';
import LogoutScreen from './LogoutScreen';
import MeScreen from './MeScreen';
function render(screen: React.ReactNode, services: IdentityServices) {
  renderAction(
    React.createElement(IdentityProvider, { services, children: screen }),
  );
}
export function Login(
  props: React.ComponentProps<typeof LoginScreen>,
  services: IdentityServices,
): void {
  render(React.createElement(LoginScreen, props), services);
}
export function Logout(services: IdentityServices): void {
  render(React.createElement(LogoutScreen), services);
}
export function Me(services: IdentityServices): void {
  render(React.createElement(MeScreen), services);
}

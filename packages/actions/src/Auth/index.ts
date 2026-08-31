import React from 'react';
import { render } from 'ink';
import MeComponent from './meCompoment';
import LogoutComponent from './logoutCompoment';
import LoginComponent from './loginCompoment';

export function Login(
  props: React.ComponentProps<typeof LoginComponent>,
): void {
  render(React.createElement(LoginComponent, props));
}

export function Me(props: Record<string, unknown>): void {
  render(React.createElement(MeComponent, props));
}

export function Logout(props: Record<string, unknown>): void {
  render(React.createElement(LogoutComponent, props));
}

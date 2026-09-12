import React from 'react';

import { renderAction } from '@quark/ui/CLI';
import LoginScreen from './LoginScreen';
import LogoutScreen from './LogoutScreen';
import MeScreen from './MeScreen';

export function Login(props: React.ComponentProps<typeof LoginScreen>): void {
  renderAction(React.createElement(LoginScreen, props));
}

export function Me(): void {
  renderAction(React.createElement(MeScreen));
}

export function Logout(): void {
  renderAction(React.createElement(LogoutScreen));
}

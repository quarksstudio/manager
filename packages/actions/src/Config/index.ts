import React from 'react';
import { render } from 'ink';
import GetCompoment from './GetCompoment';
import SetCompoment from './SetCompoment';
import ListCompoment from './ListCompoment';

export function Set(props: Record<string, unknown>): void {
  render(React.createElement(SetCompoment, props));
}

export function Get(props: Record<string, unknown>): void {
  render(React.createElement(GetCompoment, props));
}

export function List(): void {
  render(React.createElement(ListCompoment));
}

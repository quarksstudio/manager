import React from 'react';
import { renderAction } from '@quark/ui/CLI';
import { ConfigGetScreen } from './ConfigGetScreen';
import { ConfigSetScreen } from './ConfigSetScreen';
import { ConfigListScreen } from './ConfigListScreen';
type KeyInput = string | { key?: string; value?: string };
export function Set(input: KeyInput, value?: string): void {
  const props =
    typeof input === 'string'
      ? { configKey: input, value }
      : { configKey: input.key, value: input.value };
  renderAction(React.createElement(ConfigSetScreen, props));
}
export function Get(input: KeyInput): void {
  renderAction(
    React.createElement(ConfigGetScreen, {
      configKey: typeof input === 'string' ? input : input.key,
    }),
  );
}
export function List(): void {
  renderAction(React.createElement(ConfigListScreen));
}

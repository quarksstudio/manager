import React from 'react';
import { AddScreen, type AddScreenProps } from './AddScreen';

export function InstallScreen(props: Omit<AddScreenProps, 'packageName'>) {
  return <AddScreen {...props} />;
}

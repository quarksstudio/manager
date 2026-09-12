import React from 'react';

import { renderAction } from '@quark/ui/CLI';
import TestScreen from './TestScreen';

export interface TestActionOptions {
  tier?: string;
  seed?: number;
  isolated?: boolean;
  json?: boolean;
}

export default function Test(
  targetDir?: string,
  options: TestActionOptions = {},
): void {
  renderAction(
    React.createElement(TestScreen, {
      targetDir,
      ...options,
    }),
    { preserveOutput: true },
  );
}

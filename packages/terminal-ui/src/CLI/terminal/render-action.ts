import React from 'react';
import { render, type Instance } from 'ink';

export interface RenderActionOptions {
  preserveOutput?: boolean;
}

export function renderAction(
  element: React.ReactElement,
  options: RenderActionOptions = {},
): Instance {
  return render(element, {
    exitOnCtrlC: true,
    patchConsole: false,
    ...(options.preserveOutput ? { incrementalRendering: false } : {}),
  });
}

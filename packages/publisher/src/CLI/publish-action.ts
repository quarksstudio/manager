import React from 'react';

import { renderAction } from '@quark/ui/CLI';
import { PublishScreen } from './PublishScreen';
import type { CertificationTier } from '@quark/tester';

export interface PublishOptions {
  tier?: CertificationTier;
  outputDir?: string;
  token?: string;
  upload?: boolean;
}

export interface PublishResult {
  archive: string;
  verification: { passed: boolean };
  uploaded: boolean;
}

export default function Publish(
  sourceDir?: string,
  options: PublishOptions = {},
): void {
  renderAction(
    React.createElement(PublishScreen, {
      sourceDir,
      tier: options.tier,
      outputDir: options.outputDir,
      token: options.token,
      upload: options.upload,
    }),
    { preserveOutput: true },
  );
}

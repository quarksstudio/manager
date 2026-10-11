import React from 'react';
import { Text } from 'ink';
import { Panel, Screen } from '@quarks.studio/terminal-ui';
import type { loadPackageInfo } from '../application/package-info';

export function InfoContent({
  info,
}: {
  info: Awaited<ReturnType<typeof loadPackageInfo>>;
}) {
  const lines = [
    info.heading,
    `- tarball: ${info.tarball}`,
    `- shasum: ${info.shasum}`,
    `- integrity: ${info.integrity}`,
    `- certification: ${info.certification}`,
    '',
    'Authors:',
    ...(info.authors.length
      ? info.authors.map((author) => ` - ${author}`)
      : [' None']),
    '',
    'Versions:',
    ...(info.versions.length
      ? info.versions.map((version) => ` - ${version}`)
      : [' None']),
  ];
  return (
    <Screen title="Info" subtitle={info.summary}>
      <Panel color="info" width="100%">
        {lines.map((line, index) => (
          <Text key={index} wrap="wrap">
            {line || ' '}
          </Text>
        ))}
      </Panel>
    </Screen>
  );
}

import React, { useEffect } from 'react';
import { useApp } from 'ink';
import { useFetchPackage } from '../index';

import { KeyValue, Panel, Result, Screen, StatusLine } from '@quark/ui/CLI';

interface InfoScreenProps {
  name: string;
}

export function InfoScreen({ name }: InfoScreenProps) {
  const { data: item, error, loading } = useFetchPackage(name);
  const { exit } = useApp();

  useEffect(() => {
    if (!loading) exit();
  }, [exit, loading]);

  if (loading) {
    return (
      <Screen title="Info">
        <StatusLine status="running" message={`Fetching ${name}...`} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Info">
        <Result success={false} message={String(error)} />
      </Screen>
    );
  }

  const pkg = item as Record<string, unknown> | undefined;

  return (
    <Screen title="Info" subtitle={name}>
      <Panel color="info">
        <KeyValue
          items={[
            { key: 'Package', value: name },
            {
              key: 'Version',
              value: pkg?.['version'] ? String(pkg['version']) : undefined,
            },
            {
              key: 'Description',
              value: pkg?.['description']
                ? String(pkg['description'])
                : undefined,
            },
            {
              key: 'Author',
              value: pkg?.['author'] ? String(pkg['author']) : undefined,
            },
          ].filter((i) => i.value !== undefined)}
        />
      </Panel>
    </Screen>
  );
}

export default InfoScreen;

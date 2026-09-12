import React, { useEffect } from 'react';
import { useApp } from 'ink';
import { useConfig } from '../index';
import { EXIT_CODES } from '@quark/ui/CLI';
import { KeyValue, Result, Screen, StatusLine } from '@quark/ui/CLI';

export function ConfigListScreen() {
  const { config, loading, error } = useConfig();
  const { exit } = useApp();
  useEffect(() => {
    if (!loading) {
      if (error) process.exitCode = EXIT_CODES.configurationFailure;
      exit();
    }
  }, [loading, error, exit]);
  return (
    <Screen title="Config">
      {loading ? (
        <StatusLine status="running" message="Loading configuration..." />
      ) : error ? (
        <Result success={false} message={error.message} />
      ) : (
        <KeyValue
          items={Object.entries(config)
            .filter(([key]) => key !== 'token')
            .map(([key, value]) => ({ key, value: String(value ?? '—') }))}
        />
      )}
    </Screen>
  );
}

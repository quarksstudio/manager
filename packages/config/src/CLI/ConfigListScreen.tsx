import React, { useEffect } from 'react';
import { useApp } from 'ink';
import { isSecretKey } from '../domain/config';
import { useConfig } from '../hooks';
import { EXIT_CODES } from '@quarks.studio/ui/CLI';
import { KeyValue, Result, Screen, StatusLine } from '@quarks.studio/ui/CLI';

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
            .filter(([key]) => !isSecretKey(key))
            .map(([key, value]) => ({
              key,
              value:
                (Array.isArray(value) ? value.join(', ') : String(value)) ||
                '—',
            }))}
        />
      )}
    </Screen>
  );
}

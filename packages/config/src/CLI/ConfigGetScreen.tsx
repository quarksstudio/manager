import React, { useEffect } from 'react';
import { useApp } from 'ink';
import { useConfig } from '../index';
import { EXIT_CODES } from '@quark/ui/CLI';
import { KeyValue, Result, Screen, StatusLine } from '@quark/ui/CLI';

export function ConfigGetScreen({ configKey = '' }: { configKey?: string }) {
  const { loading, config, error } = useConfig();
  const { exit } = useApp();
  const value = config[configKey];
  useEffect(() => {
    if (!loading) {
      if (error || value === undefined)
        process.exitCode = EXIT_CODES.configurationFailure;
      exit();
    }
  }, [loading, error, value, exit]);
  return (
    <Screen title="Config">
      {loading ? (
        <StatusLine status="running" message="Loading configuration..." />
      ) : error || value === undefined ? (
        <Result
          success={false}
          message={error?.message ?? `Unknown configuration key: ${configKey}`}
        />
      ) : (
        <KeyValue items={[{ key: configKey, value: String(value) }]} />
      )}
    </Screen>
  );
}

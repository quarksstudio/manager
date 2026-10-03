import React, { useEffect } from 'react';
import { useApp } from 'ink';
import { isConfigKey, isSecretKey } from '../domain/config';
import { useConfig } from '../hooks';
import { EXIT_CODES } from '@quarks.studio/terminal-ui';
import { KeyValue, Result, Screen, StatusLine } from '@quarks.studio/terminal-ui';

export function ConfigGetScreen({ configKey = '' }: { configKey?: string }) {
  const { loading, config, error } = useConfig();
  const { exit } = useApp();
  const value = isConfigKey(configKey) ? config[configKey] : undefined;
  const failure =
    error ??
    (!isConfigKey(configKey)
      ? new Error(`Unknown configuration key: ${configKey}`)
      : isSecretKey(configKey)
        ? new Error(`${configKey} is a credential and is never printed`)
        : null);
  useEffect(() => {
    if (!loading) {
      if (failure) process.exitCode = EXIT_CODES.configurationFailure;
      exit();
    }
  }, [loading, failure, exit]);
  return (
    <Screen title="Config">
      {loading ? (
        <StatusLine status="running" message="Loading configuration..." />
      ) : failure || value === undefined ? (
        <Result
          success={false}
          message={failure?.message ?? 'Not configured'}
        />
      ) : (
        <KeyValue
          items={[
            {
              key: configKey,
              value:
                (Array.isArray(value) ? value.join(', ') : String(value)) ||
                '—',
            },
          ]}
        />
      )}
    </Screen>
  );
}

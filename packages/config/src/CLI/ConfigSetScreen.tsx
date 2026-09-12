import React, { useEffect, useRef, useState } from 'react';
import { useApp } from 'ink';
import { useConfig } from '../index';
import { EXIT_CODES } from '@quark/ui/CLI';
import { Result, Screen, StatusLine } from '@quark/ui/CLI';

export function ConfigSetScreen({
  configKey = '',
  value = '',
}: {
  configKey?: string;
  value?: string;
}) {
  const { loading, error: loadError, updateConfig } = useConfig();
  const { exit } = useApp();
  const [error, setError] = useState<Error | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (loading || started.current) return;
    started.current = true;
    if (loadError) {
      process.exitCode = EXIT_CODES.configurationFailure;
      exit();
      return;
    }
    void updateConfig({ [configKey]: value }).then(
      () => {
        setDone(true);
        exit();
      },
      (reason) => {
        setError(reason instanceof Error ? reason : new Error(String(reason)));
        process.exitCode = EXIT_CODES.configurationFailure;
        exit();
      },
    );
  }, [loading, loadError, configKey, value, updateConfig, exit]);
  const failure = loadError ?? error;
  return (
    <Screen title="Config">
      {failure ? (
        <Result success={false} message={failure.message} />
      ) : done ? (
        <Result success message={`Set ${configKey}`} />
      ) : (
        <StatusLine status="running" message={`Setting ${configKey}...`} />
      )}
    </Screen>
  );
}

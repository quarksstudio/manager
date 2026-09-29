import React, { useEffect, useRef, useState } from 'react';
import { useApp } from 'ink';
import { setConfigValue } from '../lib/config-repository';
import { EXIT_CODES } from '@quarks.studio/ui/CLI';
import { Result, Screen, StatusLine } from '@quarks.studio/ui/CLI';

export function ConfigSetScreen({
  configKey = '',
  value = '',
}: {
  configKey?: string;
  value?: string;
}) {
  const { exit } = useApp();
  const [error, setError] = useState<Error | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void setConfigValue(configKey, value).then(
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
  }, [configKey, value, exit]);
  return (
    <Screen title="Config">
      {error ? (
        <Result success={false} message={error.message} />
      ) : done ? (
        <Result success message={`Set ${configKey}`} />
      ) : (
        <StatusLine status="running" message={`Setting ${configKey}...`} />
      )}
    </Screen>
  );
}

import React, { useEffect, useRef } from 'react';
import { useApp } from 'ink';
import { useInstall } from '../index';
import { EXIT_CODES } from '@quark/ui/CLI';
import { Result, Screen, StatusLine } from '@quark/ui/CLI';

export interface AddScreenProps {
  packageName?: string[];
  where: string;
  models: string[];
  isSave?: boolean;
}

export function AddScreen({ packageName, where, models }: AddScreenProps) {
  const { run, result, error } = useInstall();
  const { exit } = useApp();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run(packageName, { targetInstallDir: where, providers: models }).then(
      () => exit(),
      () => {
        process.exitCode = EXIT_CODES.genericFailure;
        exit();
      },
    );
  }, [run, packageName, where, models, exit]);
  return (
    <Screen title="Install">
      {error ? (
        <Result success={false} message={String(error)} />
      ) : result ? (
        <Result
          success
          message={`${result.installed.length} installed, ${result.reused.length} reused`}
        />
      ) : (
        <StatusLine status="running" message="Installing dependencies..." />
      )}
    </Screen>
  );
}

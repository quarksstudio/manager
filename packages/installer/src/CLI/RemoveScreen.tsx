import React, { useEffect, useRef } from 'react';
import { useApp } from 'ink';
import { useUninstallPackage } from '../index';
import { EXIT_CODES } from '@quark/ui/CLI';
import { Result, Screen, StatusLine } from '@quark/ui/CLI';

export function RemoveScreen({
  packageName,
  where,
}: {
  packageName: string;
  where: string;
}) {
  const { uninstall, error, isSuccess, currentStep } =
    useUninstallPackage(where);
  const { exit } = useApp();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void uninstall(packageName).then(
      () => exit(),
      () => {
        process.exitCode = EXIT_CODES.genericFailure;
        exit();
      },
    );
  }, [uninstall, packageName, exit]);
  return (
    <Screen title="Remove">
      {error ? (
        <Result success={false} message={error.message} />
      ) : isSuccess ? (
        <Result success message={`Removed ${packageName}`} />
      ) : (
        <StatusLine
          status="running"
          message={`Removing ${packageName}...`}
          detail={currentStep}
        />
      )}
    </Screen>
  );
}
export default RemoveScreen;

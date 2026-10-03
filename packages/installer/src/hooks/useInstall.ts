import { useCallback, useRef, useState } from 'react';
import {
  install,
  type InstallOptions,
  type InstallResult,
} from '../lib/installer';
import { type UseInstallState } from '../presentation/services';
export function useInstall(
  defaultOptions: InstallOptions = {},
): UseInstallState {
  const optionsRef = useRef(defaultOptions);
  optionsRef.current = defaultOptions;
  const [installing, setInstalling] = useState(false);
  const [result, setResult] = useState<InstallResult | null>(null);
  const [error, setError] = useState<unknown>();

  const run = useCallback(
    async (
      packageSelector?: string | string[],
      options: InstallOptions = {},
    ): Promise<InstallResult> => {
      setInstalling(true);
      setError(undefined);
      try {
        const installed = await install(packageSelector, {
          ...optionsRef.current,
          ...options,
        });
        setResult(installed);
        return installed;
      } catch (reason) {
        setError(reason);
        throw reason;
      } finally {
        setInstalling(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError(undefined);
    setResult(null);
  }, []);

  return { error, installing, result, run, reset };
}

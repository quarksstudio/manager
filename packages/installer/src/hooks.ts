import { useCallback, useState } from 'react';

import {
  install,
  type InstallOptions,
  type InstallResult,
} from './lib/installer';
import {
  uninstall as uninstallPackage,
  type UninstallStep,
} from './lib/uninstaller';

export interface UseInstallState {
  error: unknown;
  installing: boolean;
  result: InstallResult | null;
  run: (
    packageSelector?: string,
    options?: InstallOptions,
  ) => Promise<InstallResult>;
  reset: () => void;
}

export function useInstall(
  defaultOptions: InstallOptions = {},
): UseInstallState {
  const [installing, setInstalling] = useState(false);
  const [result, setResult] = useState<InstallResult | null>(null);
  const [error, setError] = useState<unknown>();

  const run = useCallback(
    async (
      packageSelector?: string,
      options: InstallOptions = {},
    ): Promise<InstallResult> => {
      setInstalling(true);
      setError(undefined);
      try {
        const installed = await install(packageSelector, {
          ...defaultOptions,
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
    [defaultOptions],
  );

  const reset = useCallback(() => {
    setError(undefined);
    setResult(null);
  }, []);

  return { error, installing, result, run, reset };
}

export interface UseUninstallPackageReturn {
  uninstall: (packageName: string) => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  currentStep: UninstallStep;
  progressPercentage: number;
  reset: () => void;
}

export function useUninstallPackage(
  targetInstallDir: string,
): UseUninstallPackageReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentStep, setCurrentStep] = useState<UninstallStep>('idle');
  const [progressPercentage, setProgressPercentage] = useState(0);

  const run = useCallback(
    async (packageName: string): Promise<void> => {
      setIsLoading(true);
      setIsSuccess(false);
      setError(null);
      try {
        await uninstallPackage(
          packageName,
          targetInstallDir,
          (step, progress) => {
            setCurrentStep(step);
            setProgressPercentage(progress);
          },
        );
        setIsSuccess(true);
      } catch (reason) {
        setError(reason instanceof Error ? reason : new Error(String(reason)));
        throw reason;
      } finally {
        setIsLoading(false);
      }
    },
    [targetInstallDir],
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(false);
    setError(null);
    setCurrentStep('idle');
    setProgressPercentage(0);
  }, []);

  return {
    uninstall: run,
    isLoading,
    isSuccess,
    isError: error !== null,
    error,
    currentStep,
    progressPercentage,
    reset,
  };
}

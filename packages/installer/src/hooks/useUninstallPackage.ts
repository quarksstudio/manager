import { useCallback, useState } from 'react';
import {
  uninstall as uninstallPackage,
  type UninstallStep,
} from '../lib/uninstaller';
import { type UseUninstallPackageReturn } from '../presentation/services';
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

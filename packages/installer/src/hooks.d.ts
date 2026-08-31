import { type InstallOptions, type InstallResult } from './lib/installer';
import { type UninstallStep } from './lib/uninstaller';
export interface UseInstallState {
    error: unknown;
    installing: boolean;
    result: InstallResult | null;
    run: (packageSelector?: string, options?: InstallOptions) => Promise<InstallResult>;
    reset: () => void;
}
export declare function useInstall(defaultOptions?: InstallOptions): UseInstallState;
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
export declare function useUninstallPackage(targetInstallDir: string): UseUninstallPackageReturn;

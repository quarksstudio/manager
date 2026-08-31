export interface RecursiveInstallOptions {
    force?: boolean;
    targetInstallDir?: string;
    providers?: string[];
}
export interface LockedPackage {
    version: string;
    resolved: string;
    integrity: string;
    isCertified: boolean;
    mappedFiles: string[];
    dependencies?: Record<string, string>;
}
export interface SkillLockfile {
    lockfileVersion: 1;
    dependencies: Record<string, string>;
    packages: Record<string, LockedPackage>;
}
export interface InstallResult {
    targetInstallDir: string;
    lockfilePath: string;
    installed: string[];
    reused: string[];
    rootLocators: string[];
    isolatedLocators: string[];
}
export declare function install(packageSelector?: string, options?: RecursiveInstallOptions): Promise<InstallResult>;

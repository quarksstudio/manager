export type UninstallStep = 'idle' | 'locating' | 'reading-manifest' | 'removing-files' | 'cleaning' | 'completed';
export declare class PackageNotFound extends Error {
    readonly name = "PackageNotFound";
    constructor(packageName: string);
}
export declare function uninstall(packageName: string, targetInstallDir: string, onStep?: (step: UninstallStep, progressPercentage: number) => void): Promise<void>;

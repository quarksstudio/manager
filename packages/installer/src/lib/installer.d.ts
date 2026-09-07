import { validatePermissions, type UserPolicy } from '@quark/permissions';
import {
  type InstallResult,
  type RecursiveInstallOptions,
} from './recursive-installer';
export interface InstallOptions extends RecursiveInstallOptions {
  policy?: UserPolicy;
  approvePermissions?: (
    denied: ReturnType<typeof validatePermissions>['deniedPermissions'],
  ) => Promise<boolean>;
}
export type {
  InstallResult,
  LockedPackage,
  SkillLockfile,
} from './recursive-installer';
export { PackageNotFound, uninstall, type UninstallStep } from './uninstaller';
export declare function install(
  packageSelector?: string,
  options?: InstallOptions,
): Promise<InstallResult>;
export declare function installSkill(
  name: string,
  version: string,
  isGlobal?: boolean,
  cwd?: string,
  options?: InstallOptions,
): Promise<void>;

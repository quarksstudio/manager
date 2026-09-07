import type { Manifest } from '@quark/manifest';
export interface UserPolicy {
  allowedDomains?: string[];
  allowFilesystem?: boolean;
  allowedTools?: string[];
}
export interface PermissionCheckResult {
  granted: boolean;
  deniedPermissions: {
    network?: string[];
    tools?: string[];
    filesystem?: boolean;
  };
}
export declare function checkNetworkAccess(
  domain: string,
  policy: UserPolicy,
): boolean;
export declare function checkFilesystemAccess(policy: UserPolicy): boolean;
export declare function checkToolAccess(
  tool: string,
  policy: UserPolicy,
): boolean;
export declare function validatePermissions(
  manifest: Manifest,
  policy: UserPolicy,
): PermissionCheckResult;
export declare function promptForPermissions(
  denied: PermissionCheckResult['deniedPermissions'],
): Promise<boolean>;

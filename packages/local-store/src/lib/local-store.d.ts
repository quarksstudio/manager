export interface InstalledSkill {
  name: string;
  version: string;
  path: string;
  hash?: string;
  source?: string;
  dependencies?: Record<string, string>;
  enabled: boolean;
  installedAt: string;
}
export interface StoreCatalog {
  schemaVersion: 1;
  skills: Record<string, InstalledSkill>;
}
export declare function getStorePath(isGlobal?: boolean, cwd?: string): string;
export declare function loadCatalog(
  isGlobal?: boolean,
  cwd?: string,
): StoreCatalog;
export declare function saveCatalog(
  catalog: StoreCatalog,
  isGlobal?: boolean,
  cwd?: string,
): void;
export declare function getSkillPath(
  name: string,
  version: string,
  isGlobal?: boolean,
  cwd?: string,
): string;
export declare function isInstalled(
  name: string,
  version: string,
  isGlobal?: boolean,
  cwd?: string,
): boolean;
export declare function registerInstall(
  name: string,
  version: string,
  isGlobal?: boolean,
  cwd?: string,
  metadata?: Pick<InstalledSkill, 'hash' | 'source' | 'dependencies'>,
): void;
export declare function unregisterInstall(
  name: string,
  version: string,
  isGlobal?: boolean,
  cwd?: string,
): void;
export declare function listInstalled(
  isGlobal?: boolean,
  cwd?: string,
): InstalledSkill[];
export declare function removeSkill(
  name: string,
  version: string,
  isGlobal?: boolean,
  cwd?: string,
): void;

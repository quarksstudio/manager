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

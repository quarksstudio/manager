export interface CachedSkillArtifact {
  name: string;
  version: string;
  registry: string;
  hash: string;
  sizeBytes: number;
  cachedAt: string;
  lastUsedAt: string;
}

export interface CacheIndex {
  schemaVersion: 1;
  artifacts: Record<string, CachedSkillArtifact>;
}

export interface CacheVerificationResult {
  valid: CachedSkillArtifact[];
  invalid: CachedSkillArtifact[];
}

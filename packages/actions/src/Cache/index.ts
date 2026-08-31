import {
  cleanSkillCache,
  listSkillCache,
  verifySkillCache,
  type CachedSkillArtifact,
  type CacheVerificationResult,
} from '@quark/local-store';

export async function List(): Promise<CachedSkillArtifact[]> {
  const entries = await listSkillCache();
  if (!entries.length) console.log('Skill cache is empty');
  for (const entry of entries) {
    console.log(
      `${entry.name}@${entry.version} ${entry.hash} ${entry.sizeBytes} bytes`,
    );
  }
  return entries;
}

export async function Verify(): Promise<CacheVerificationResult> {
  const result = await verifySkillCache();
  console.log(
    `Cache verification: ${result.valid.length} valid, ${result.invalid.length} invalid`,
  );
  if (result.invalid.length) process.exitCode = 1;
  return result;
}

export async function Clean(): Promise<void> {
  await cleanSkillCache();
  console.log('Skill cache cleared');
}

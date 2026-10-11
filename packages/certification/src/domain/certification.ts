import type { CertificationTier } from '@quarks.studio/registry/domain';
export type {
  CertificationTier,
  CertificationStatus,
  CertificationCheck,
  Certification,
} from '@quarks.studio/registry/domain';
export const CERTIFICATION_TIERS = [
  'TIER_1',
  'TIER_2',
  'TIER_3',
  'TIER_4',
] as const;
export function parseCertificationTier(value: string): CertificationTier {
  if (!CERTIFICATION_TIERS.includes(value as CertificationTier)) {
    throw new Error(
      `Invalid tier: ${value}. Expected one of: ${CERTIFICATION_TIERS.join(', ')}`,
    );
  }
  return value as CertificationTier;
}

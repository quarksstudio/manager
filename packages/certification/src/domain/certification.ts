export const CERTIFICATION_TIERS = [
  'TIER_1',
  'TIER_2',
  'TIER_3',
  'TIER_4',
] as const;
export type CertificationTier = (typeof CERTIFICATION_TIERS)[number];
export function parseCertificationTier(value: string): CertificationTier {
  if (!CERTIFICATION_TIERS.includes(value as CertificationTier)) {
    throw new Error(
      `Invalid tier: ${value}. Expected one of: ${CERTIFICATION_TIERS.join(', ')}`,
    );
  }
  return value as CertificationTier;
}

export type CertificationStatus = 'approved' | 'pending' | 'rejected';

export interface CertificationCheck {
  name: string;
  passed: boolean;
}

export interface Certification {
  environment?: 'local';
  tier: CertificationTier;
  status: CertificationStatus;
  approvedAt?: string;
  reviewedBy?: string;
  reportUrl?: string;
  checks?: CertificationCheck[];
  logUrl?: string;
}

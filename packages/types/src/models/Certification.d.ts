export type CertificationStatus = 'approved' | 'pending' | 'rejected';
export type CertificationTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';
export interface Certification {
  tier: CertificationTier;
  status: CertificationStatus;
  approvedAt?: string;
  reviewedBy?: string;
  reportUrl?: string;
}

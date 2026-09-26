export type LandingTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';

export interface LandingPackage {
  name: string;
  version?: string;
  href: string;
  hash?: string;
  viewsCount?: number;
  downloadsCount?: number;
  certifiedAt?: string;
}

export interface LandingTierColumns {
  mostViewed: LandingPackage[];
  mostDownloaded: LandingPackage[];
  latestCertified: LandingPackage[];
}

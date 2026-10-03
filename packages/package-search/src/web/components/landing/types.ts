import type { LandingTier } from '@quarks.studio/web-ui';
export type { LandingTier } from '@quarks.studio/web-ui';

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

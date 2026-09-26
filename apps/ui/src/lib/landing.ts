import type {
  LandingPackage,
  LandingTier,
  LandingTierColumns,
} from '@quarks.studio/ui/web';
import { packageUrl } from './registry';

const TIER_ORDER: LandingTier[] = ['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'];

/**
 * The registry exposes package ids without ranking statistics, so each item is
 * distributed across the four certification tiers and surfaced in all three
 * columns. Optional fields (hash, version, metrics) stay empty and the landing
 * cards degrade gracefully.
 */
export function landingTiers(
  items: Array<{ id: string }>,
): Record<LandingTier, LandingTierColumns> {
  const assigned: Record<LandingTier, LandingPackage[]> = {
    TIER_1: [],
    TIER_2: [],
    TIER_3: [],
    TIER_4: [],
  };
  items.forEach((item, index) => {
    const tier = TIER_ORDER[index % TIER_ORDER.length];
    assigned[tier].push({
      name: item.id,
      href: packageUrl(item.id),
    });
  });
  return Object.fromEntries(
    TIER_ORDER.map((tier) => {
      const packages = assigned[tier];
      return [
        tier,
        {
          mostViewed: packages,
          mostDownloaded: packages,
          latestCertified: packages,
        },
      ];
    }),
  ) as Record<LandingTier, LandingTierColumns>;
}

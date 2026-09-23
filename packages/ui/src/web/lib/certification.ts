import type { Certification } from '@quarks.studio/registry/client';
const TIER_RANK: Record<string, number> = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
  TIER_4: 4,
};

export interface CertificationBadge {
  tier: string;
  label: string;
}

/** Highest approved certification, independent of any selected version. */
export function certificationBadge(
  certifications: Certification[] | undefined,
): CertificationBadge | null {
  const approved = (certifications ?? [])
    .filter((item) => item.status === 'approved')
    .sort((a, b) => (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0));
  const best = approved[0];
  return best
    ? {
        tier: best.tier,
        label:
          best.environment === 'local'
            ? `Local simulation ${best.tier}`
            : `Certified ${best.tier}`,
      }
    : null;
}

import { LandingTierSection } from './LandingTierSection';
import { TIER_ORDER } from './tiers';
import type { LandingTier, LandingTierColumns } from './types';

export interface LandingTierMatrixProps {
  tiers: Record<LandingTier, LandingTierColumns>;
}

export function LandingTierMatrix({ tiers }: LandingTierMatrixProps) {
  return (
    <div className="space-y-12 py-12">
      {TIER_ORDER.map((tier) => (
        <LandingTierSection key={tier} tier={tier} columns={tiers[tier]} />
      ))}
    </div>
  );
}

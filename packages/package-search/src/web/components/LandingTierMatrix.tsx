import { LandingTierSection } from './LandingTierSection';
import { TIER_ORDER } from '../lib/tiers';
import type { LandingTier, LandingTierColumns } from './types';

export interface LandingTierMatrixProps {
  tiers: Record<LandingTier, LandingTierColumns>;
}

export function LandingTierMatrix({ tiers }: LandingTierMatrixProps) {
  return (
    <div className="space-y-12 py-12 mx-auto flex min-h-[40vh] max-w-7xl flex-col justify-center gap-6 px-4">
      {TIER_ORDER.map((tier) => (
        <LandingTierSection key={tier} tier={tier} columns={tiers[tier]} />
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { usePackageSearchWebServices } from '../../hooks/usePackageSearchWebServices';
import { LandingHero } from '../components/LandingHero';
import { LandingTierMatrix } from '../components/LandingTierMatrix';
import type { LandingTier, LandingTierColumns } from '../components/types';
import { landingTiers } from '../lib/landing';

export interface LandingBoundaryProps {
  blogUrl: string;
  exploreUrl: string;
  packageUrl: (name: string) => string;
}

export function LandingBoundary({
  blogUrl,
  exploreUrl,
  packageUrl,
}: LandingBoundaryProps) {
  const services = usePackageSearchWebServices();
  const [tiers, setTiers] = useState<Record<
    LandingTier,
    LandingTierColumns
  > | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await services.home();
        if (!cancelled) setTiers(landingTiers(result.items, packageUrl));
      } catch {
        if (!cancelled) setError('Could not load packages.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [services, packageUrl]);
  return (
    <>
      <LandingHero exploreUrl={exploreUrl} blogUrl={blogUrl} />
      {tiers ? (
        <LandingTierMatrix tiers={tiers} />
      ) : (
        error && (
          <p className="pb-12 text-center text-sm text-slate-400">{error}</p>
        )
      )}
    </>
  );
}

export default LandingBoundary;

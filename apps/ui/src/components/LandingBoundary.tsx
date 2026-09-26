import { useEffect, useState } from 'react';
import { createRegistryClient } from '@quarks.studio/registry/client';
import {
  LandingHero,
  LandingTierMatrix,
  type LandingTier,
  type LandingTierColumns,
} from '@quarks.studio/ui/web';
import { landingTiers } from '../lib/landing';

const registryBaseUrl =
  (import.meta.env.PUBLIC_REGISTRY_API_URL as string | undefined) ??
  'http://localhost:8081/v1';

export interface LandingBoundaryProps {
  blogUrl: string;
}

export function LandingBoundary({ blogUrl }: LandingBoundaryProps) {
  const [tiers, setTiers] = useState<Record<
    LandingTier,
    LandingTierColumns
  > | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const client = createRegistryClient({ baseUrl: registryBaseUrl });
      try {
        const result = await client.Packages.search();
        if (!cancelled) setTiers(landingTiers(result.items));
      } catch {
        if (!cancelled) setError('Could not load packages.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <>
      <LandingHero exploreUrl="/search" blogUrl={blogUrl} />
      {tiers ? (
        <LandingTierMatrix tiers={tiers} />
      ) : error ? (
        <p className="pb-12 text-center text-sm text-slate-400">{error}</p>
      ) : null}
    </>
  );
}

export default LandingBoundary;

import { useEffect, useState } from 'react';
import { browsePlans, browseTierLadder, partitionPlanSystems, type CatalogProduct, type PaymentSystem, type PlanSystems, type TierOffer } from '@quarks.studio/commerce';
import { RegistryHttpError } from '@quarks.studio/types/http';
import { useCommerceWebServices } from './services';
import { PlanGrid } from './components/pricing/PlanGrid';
import { TierMatrix } from './components/pricing/TierMatrix';


export interface PricingBoundaryProps {
  /** `packages` shows the ladder, `plans` the monthly plans. */
  mode: 'products' | 'plans';
  /** Present on the version pages; absent on the global catalog. */
  packageName?: string;
  versionId?: string;
  apiBaseUrl?: string;
}

export function PricingBoundary({
  mode,
  packageName,
  versionId,
  apiBaseUrl,
}: PricingBoundaryProps) {
  const services = useCommerceWebServices();
  const [plans, setPlans] = useState<CatalogProduct[] | null>(null);
  const [systems, setSystems] = useState<PaymentSystem[]>([]);
  const [offers, setOffers] = useState<TierOffer[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const available = (await services.listSystems()).systems ?? [];
        if (!cancelled) setSystems(available);
        if (mode === 'plans') {
          const rows = await browsePlans(services.catalog);
          if (!cancelled) setPlans(rows);
          return;
        }
        // Without a package there is no version to price, so the global page
        // keeps the ladder closed instead of guessing a version.
        if (!packageName) {
          if (!cancelled) setOffers([]);
          return;
        }
        const held = await services.getHeldTier(packageName, versionId);
        const rows = await browseTierLadder(services.catalog, held);
        if (!cancelled) setOffers(rows);
      } catch (failure) {
        if (cancelled) return;
        const status =
          failure instanceof RegistryHttpError ? failure.status : undefined;
        setError(
          status === 404
            ? 'We could not find that product.'
            : 'Could not load the prices.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, packageName, versionId, services]);

  if (error)
    return <p className="pb-12 text-center text-sm text-slate-400">{error}</p>;

  // Without a package there is no version to price, so the global page keeps
  // the ladder closed instead of guessing one, exactly as the server does.
  const packageId = packageName ?? '';
  if (mode === 'products' && !packageId) {
    return (
      <p className="text-sm text-slate-500">
        A certification is bought for one concrete version of a package. Open
        the package you want to certify to see its ladder.
      </p>
    );
  }

  if (mode === 'plans') {
    const planSystems: PlanSystems = partitionPlanSystems(systems);
    return plans && (
      <PlanGrid
        plans={plans}
        systems={planSystems}
        packageId={packageId || undefined}
        apiBaseUrl={apiBaseUrl}
      />
    )
  }

  return offers && (
    <TierMatrix
      offers={offers}
      systems={systems}
      packageId={packageId}
      versionId={versionId ?? ''}
      apiBaseUrl={apiBaseUrl}
    />
  )
}

export default PricingBoundary;

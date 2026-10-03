import type { AstroCookies } from 'astro';
import { browsePlans, browseTierLadder, partitionPlanSystems, type CatalogProduct, type PaymentSystem, type PlanSystems, type TierOffer } from '@quarks.studio/commerce';
import { heldTier } from '@quarks.studio/certification';

import { registry, statusFor } from './registry';

export interface PricingCatalog {
  plans: CatalogProduct[];
  systems: PaymentSystem[];
  planSystems: PlanSystems;
  error?: string;
}

async function paymentSystems(
  cookies: AstroCookies,
): Promise<{ systems: PaymentSystem[]; error?: string }> {
  try {
    const { systems } = await (await registry(cookies)).Gateway.listSystems();
    return { systems };
  } catch (failure) {
    // A public route failing must not delete the session the page still needs.
    statusFor(failure, cookies);
    return { systems: [], error: 'Could not load the payment systems.' };
  }
}

/**
 * The catalog is global: `GET /v1/products` has no package filter, and the
 * country comes from the server. Plans are sorted by price; the ladder is built
 * per version because only the held tier differs.
 */
export async function loadPricing(
  cookies: AstroCookies,
): Promise<PricingCatalog> {
  const [{ systems, error: systemsError }, plans] = await Promise.all([
    paymentSystems(cookies),
    (async () => {
      try {
        return { value: await browsePlans((await registry(cookies)).Catalog) };
      } catch (failure) {
        statusFor(failure, cookies);
        return {
          value: [] as CatalogProduct[],
          error: 'Could not load the pricing catalog.',
        };
      }
    })(),
  ]);
  return {
    plans: plans.value,
    systems,
    planSystems: partitionPlanSystems(systems),
    error: plans.error ?? systemsError,
  };
}

export interface VersionLadder {
  offers: TierOffer[];
  held: number;
  error?: string;
}

export async function loadLadder(
  cookies: AstroCookies,
  packageName: string,
  versionId: string,
): Promise<VersionLadder> {
  const client = await registry(cookies);
  try {
    const detail = await client.Packages.get(packageName);
    const version = (detail.versions ?? []).find(
      (item) => item.version === versionId,
    );
    // `pending` holds the tier, so a version awaiting its audit is locked too.
    const held = heldTier(version?.certifications);
    return { offers: await browseTierLadder(client.Catalog, held), held };
  } catch (failure) {
    statusFor(failure, cookies);
    return { offers: [], held: 0, error: 'Could not load the catalog.' };
  }
}

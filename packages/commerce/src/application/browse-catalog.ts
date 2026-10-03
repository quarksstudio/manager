import { logger } from '@quarks.studio/logger';
import type { CatalogProduct } from '../domain/product';
import { isPlanProduct, isTierProduct } from '../domain/product';
import {
  hasTierOverlap,
  isPurchasable,
  sortByPrice,
  type TierOffer,
} from '../domain/offer-eligibility';
import type { CatalogRemote } from './catalog.port';

/** The staircase: ascending by tier, which is not the same as by price. */
export async function browseTierLadder(
  remote: CatalogRemote,
  held: number,
): Promise<TierOffer[]> {
  const all = await remote.listAll();
  if (hasTierOverlap(all)) {
    logger.warn('catalog: two products share a tier; check the Products seed');
  }
  return all
    .filter(isTierProduct)
    .sort((a, b) => a.tier - b.tier)
    .map((product) => ({
      product,
      held,
      purchasable: isPurchasable(product, held),
    }));
}

export async function browsePlans(
  remote: CatalogRemote,
): Promise<CatalogProduct[]> {
  return sortByPrice((await remote.listAll()).filter(isPlanProduct));
}

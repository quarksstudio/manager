import { isTierProduct, type CatalogProduct } from './product';

/**
 * Mirrors `ExecutionLadder.assert` (409 UPWARD_ONLY) plus the `active` filter
 * `Product.fetch` already applies, so the page never renders a link the server
 * is going to refuse.
 */
export function isPurchasable(product: CatalogProduct, held: number): boolean {
  return product.active && product.tier > held;
}

/** Plans are ordered by price; that is the product decision. */
export function sortByPrice(
  products: readonly CatalogProduct[],
): CatalogProduct[] {
  return [...products].sort((a, b) => a.amountCents - b.amountCents);
}

/**
 * Not a dedupe. The `id` is the key and there is one document per `id`, so two
 * rows sharing a tier are a bad seed, not two prices for one tier. Hiding them
 * would bury the data bug, so this only reports it.
 */
export function hasTierOverlap(products: readonly CatalogProduct[]): boolean {
  const tiers = products.filter(isTierProduct).map((product) => product.tier);
  return new Set(tiers).size !== tiers.length;
}

export interface TierOffer {
  product: CatalogProduct;
  held: number;
  purchasable: boolean;
}

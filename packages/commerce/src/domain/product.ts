import type { CertificationTier } from '@quarks.studio/types/models';

export type ProductKind = 'tier' | 'plan';

/**
 * Mirrors `ProductInterface`. `amountCents` is always an integer, `country:
 * null` is the global price, and `tier` is numeric: 1..4 for certifications and
 * 0 for plans. The `id` is opaque (`N1`, `N3`) and is the key: one document per
 * `id`, so two rows sharing a tier are a bad seed, not two prices.
 */
export interface CatalogProduct {
  id: string;
  kind: ProductKind;
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  country: string | null;
  tier: number;
  active: boolean;
  features: string[];
  period?: 'month';
}

export function isTierProduct(product: CatalogProduct): boolean {
  return product.kind === 'tier';
}

export function isPlanProduct(product: CatalogProduct): boolean {
  return product.kind === 'plan';
}

/** The product's numeric tier as the name the rest of the UI already uses. */
export function tierName(tier: number): CertificationTier {
  const index = Math.min(4, Math.max(1, Math.trunc(tier) || 1));
  return `TIER_${index}` as CertificationTier;
}

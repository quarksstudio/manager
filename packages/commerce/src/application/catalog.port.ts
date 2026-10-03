import type { CatalogProduct } from '../domain/product';

/**
 * `GET /v1/products` returns both kinds and the server only sorts by country
 * precedence. Ordering by tier and by price is a client decision, so the port
 * exposes the raw list and nothing else.
 */
export interface CatalogRemote {
  listAll(): Promise<CatalogProduct[]>;
}

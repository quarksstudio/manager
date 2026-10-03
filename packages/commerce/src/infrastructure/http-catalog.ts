import { logger } from '@quarks.studio/logger';
import type { OperationContext } from '@quarks.studio/types/http';
import type { CatalogProduct, ProductKind } from '../domain/product';
import type { CatalogRemote } from '../application/catalog.port';

/** The `ProductInterface` row exactly as `GET /v1/products` returns it. */
interface ServerProduct {
  id?: string;
  kind?: string;
  name?: string;
  description?: string;
  amountCents?: number;
  currency?: string;
  country?: string | null;
  tier?: number;
  active?: boolean;
  features?: string[];
  period?: string;
}

const KINDS: ReadonlySet<string> = new Set(['tier', 'plan']);

/**
 * The public catalog. No `country` query on purpose: the server resolves the
 * country from the query, the proxy headers or the caller's IP, and sending our
 * own would override that precedence
 * (`catalog/country-from-request.interceptor.ts:34`).
 */
export function createHttpCatalog(context: OperationContext): CatalogRemote {
  return {
    async listAll(): Promise<CatalogProduct[]> {
      const rows = await context.fetchJson<ServerProduct[] | null>('products');
      if (!Array.isArray(rows)) return [];
      return rows.map(toProduct).filter(isProduct);
    },
  };
}

function toProduct(row: ServerProduct): CatalogProduct | null {
  const kind = readKind(row.kind);
  const amountCents = row.amountCents;
  if (!row.id || !row.name || !kind) return null;
  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents)) {
    logger.warn(
      `catalog: product ${row.id} has no integer amountCents; dropped`,
    );
    return null;
  }
  return {
    id: row.id,
    kind,
    name: row.name,
    description: row.description ?? '',
    amountCents,
    currency: row.currency ?? '',
    country: row.country ?? null,
    // A missing tier is a certification's rank; plans sit at 0 and are never
    // compared against a held tier.
    tier: typeof row.tier === 'number' ? row.tier : kind === 'tier' ? 1 : 0,
    active: row.active !== false,
    features: row.features ?? [],
    ...(row.period ? { period: row.period as 'month' } : {}),
  };
}

function readKind(value?: string): ProductKind | null {
  if (!value || !KINDS.has(value)) return null;
  return value as ProductKind;
}

function isProduct(product: CatalogProduct | null): product is CatalogProduct {
  return product !== null;
}

const FREE = 'Gratis';

/**
 * The server sends integer cents; no float ever reaches the domain. `0` is a
 * real amount, not a missing one: a product priced at zero is a free tier.
 */
export function formatPrice(amountCents: number, currency: string): string {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return FREE;
  const code = (currency ?? '').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
    }).format(amountCents / 100);
  } catch {
    // A bad currency in the seed must not take the pricing page down.
    return `${(amountCents / 100).toFixed(2)} ${code}`;
  }
}

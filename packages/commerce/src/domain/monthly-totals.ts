import type { StoredSubscriptionStatus, SubscriptionRecord } from './subscription';

/** One subscription contributing to a calendar month. */
export interface MonthlyTotalEntry {
  subscriptionId: string;
  packageId: string;
  productId: string;
  status: StoredSubscriptionStatus;
  amountCents: number;
  currency: string;
}

/**
 * A UTC calendar month (`YYYY-MM`) some subscriptions are billed in. Totals are
 * keyed by currency: adding two currencies together would invent an amount.
 */
export interface MonthlyTotal {
  month: string;
  entries: MonthlyTotalEntry[];
  totals: Record<string, number>;
}

function instant(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function nextMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function monthKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

/**
 * The months each subscription is billed in, month by month.
 *
 * A subscription runs from `currentPeriodStart` to `currentPeriodEnd`; without
 * an end date it only covers the month it started in (the next renewal has not
 * happened yet), and a cancelled one stops at `cancelledAt`. One package holds
 * as many subscriptions as it has plans, and months from different packages end
 * up in the same row.
 */
export function buildMonthlyTotals(
  records: readonly SubscriptionRecord[],
): MonthlyTotal[] {
  const rows = new Map<string, MonthlyTotal>();
  for (const record of records) {
    const start = instant(record.currentPeriodStart) ?? instant(record.createdAt);
    if (!start) continue;
    const end =
      instant(record.currentPeriodEnd) ??
      instant(record.cancelledAt) ??
      nextMonthStart(start);
    for (let month = monthStart(start); month < end; month = nextMonthStart(month)) {
      const key = monthKey(month);
      const row = rows.get(key) ?? { month: key, entries: [], totals: {} };
      const entry: MonthlyTotalEntry = {
        subscriptionId: record.id,
        packageId: record.packageId,
        productId: record.productId,
        status: record.status,
        amountCents: record.amountCents,
        currency: record.currency,
      };
      row.entries.push(entry);
      row.totals[record.currency] =
        (row.totals[record.currency] ?? 0) + record.amountCents;
      rows.set(key, row);
    }
  }
  return [...rows.values()]
    .sort((left, right) => left.month.localeCompare(right.month))
    .map((row) => ({
      ...row,
      entries: [...row.entries].sort((left, right) =>
        left.packageId.localeCompare(right.packageId),
      ),
    }));
}

import { buildMonthlyTotals, type SubscriptionRecord } from '../../src/index';

const record = (
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord => ({
  id: 'sub-1',
  productId: 'PL1',
  packageId: 'demo',
  userId: 'user-1',
  system: 'paypal',
  status: 'active',
  amountCents: 900,
  currency: 'USD',
  period: 'month',
  createdAt: '2026-09-15T10:00:00.000Z',
  updatedAt: '2026-09-15T10:00:00.000Z',
  ...overrides,
});

describe('buildMonthlyTotals', () => {
  it('groups one subscription into every month it is billed in', () => {
    const rows = buildMonthlyTotals([
      record({
        currentPeriodStart: '2026-09-15T00:00:00.000Z',
        currentPeriodEnd: '2026-10-15T00:00:00.000Z',
      }),
    ]);
    expect(rows.map((row) => row.month)).toEqual(['2026-09', '2026-10']);
    expect(rows[0].totals).toEqual({ USD: 900 });
    expect(rows[1].totals).toEqual({ USD: 900 });
    expect(rows[0].entries).toHaveLength(1);
  });

  it('adds every package billed in the same month together', () => {
    const rows = buildMonthlyTotals([
      record({
        id: 'sub-1',
        packageId: 'alpha',
        amountCents: 900,
        currentPeriodStart: '2026-09-01T00:00:00.000Z',
        currentPeriodEnd: '2026-10-01T00:00:00.000Z',
      }),
      record({
        id: 'sub-2',
        productId: 'PL2',
        packageId: 'beta',
        amountCents: 1500,
        currentPeriodStart: '2026-09-20T00:00:00.000Z',
        currentPeriodEnd: '2026-10-20T00:00:00.000Z',
      }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].month).toBe('2026-09');
    expect(rows[0].totals).toEqual({ USD: 2400 });
    expect(rows[0].entries.map((entry) => entry.packageId)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  it('keeps currencies apart instead of inventing an exchange rate', () => {
    const rows = buildMonthlyTotals([
      record({
        amountCents: 900,
        currency: 'USD',
        currentPeriodStart: '2026-09-01T00:00:00.000Z',
        currentPeriodEnd: '2026-10-01T00:00:00.000Z',
      }),
      record({
        id: 'sub-2',
        amountCents: 4000,
        currency: 'ARS',
        currentPeriodStart: '2026-09-05T00:00:00.000Z',
        currentPeriodEnd: '2026-10-05T00:00:00.000Z',
      }),
    ]);
    expect(rows[0].totals).toEqual({ USD: 900, ARS: 4000 });
  });

  it('covers only the start month when no renewal has been billed yet', () => {
    const rows = buildMonthlyTotals([
      record({
        currentPeriodStart: '2026-09-15T00:00:00.000Z',
        currentPeriodEnd: null,
      }),
    ]);
    expect(rows.map((row) => row.month)).toEqual(['2026-09']);
  });

  it('stops at the cancellation date when the period has no end', () => {
    const rows = buildMonthlyTotals([
      record({
        status: 'cancelled',
        currentPeriodStart: '2026-08-30T00:00:00.000Z',
        currentPeriodEnd: null,
        cancelledAt: '2026-09-20T00:00:00.000Z',
      }),
    ]);
    expect(rows.map((row) => row.month)).toEqual(['2026-08', '2026-09']);
  });

  it('falls back to the creation date of a subscription with no period', () => {
    const rows = buildMonthlyTotals([
      record({ createdAt: '2026-11-02T00:00:00.000Z' }),
    ]);
    expect(rows.map((row) => row.month)).toEqual(['2026-11']);
  });

  it('ignores a record with no usable date instead of throwing', () => {
    expect(
      buildMonthlyTotals([
        record({
          currentPeriodStart: 'not-a-date',
          currentPeriodEnd: null,
          createdAt: '',
        }),
      ]),
    ).toEqual([]);
    expect(buildMonthlyTotals([])).toEqual([]);
  });
});

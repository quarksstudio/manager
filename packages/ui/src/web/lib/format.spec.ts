import { formatCount, formatDate, formatSinceDate } from './format';

describe('formatCount', () => {
  it('keeps small numbers as integers', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands with a single fraction digit when needed', () => {
    expect(formatCount(1000)).toBe('1k');
    expect(formatCount(1234)).toBe('1.23k');
    expect(formatCount(12000)).toBe('12k');
    expect(formatCount(12345)).toBe('12.3k');
  });

  it('formats millions and billions', () => {
    expect(formatCount(2_500_000)).toBe('2.5M');
    expect(formatCount(12_000_000)).toBe('12M');
    expect(formatCount(3_000_000_000)).toBe('3B');
  });

  it('falls back for non-finite values', () => {
    expect(formatCount(Number.NaN)).toBe('0');
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('formatDate', () => {
  it('returns a locale-formatted date', () => {
    const output = formatDate('2024-01-15T00:00:00Z');
    expect(output).toMatch(/2024/);
    expect(output).not.toBe('Unknown');
  });

  it('returns Unknown for missing input', () => {
    expect(formatDate(undefined)).toBe('Unknown');
    expect(formatDate('not-a-date')).toBe('Unknown');
  });

  it('accepts a Date instance', () => {
    expect(formatDate(new Date('2024-01-15T00:00:00Z'))).toMatch(/2024/);
  });
});

describe('formatSinceDate', () => {
  it('reuses formatDate', () => {
    expect(formatSinceDate('2024-01-15T00:00:00Z')).toMatch(/2024/);
    expect(formatSinceDate(undefined)).toBe('Unknown');
  });
});

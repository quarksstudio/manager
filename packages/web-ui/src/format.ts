const UNITS = ['', 'k', 'M', 'B'];

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  let magnitude = 0;
  let step = 1;
  while (value >= step * 1000 && magnitude < UNITS.length - 1) {
    step *= 1000;
    magnitude += 1;
  }

  const scaled = value / step;
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const trimmed = scaled
    .toFixed(digits)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '');

  return `${trimmed}${UNITS[magnitude]}`;
}

export function formatDate(value?: string | number | Date): string {
  if (!value) return 'Unknown';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatSinceDate(value?: string): string {
  if (!value) return 'Unknown';
  return formatDate(value);
}

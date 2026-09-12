const PRERELEASE_ORDER: Record<string, number> = {
  alpha: 1,
  beta: 2,
  rc: 3,
};

function parse(version: string): number[] {
  const [core] = version.split(/[-+]/);
  return core.split('.').map((part) => Number.parseInt(part, 10) || 0);
}

function prereleaseRank(version: string): number {
  const segment = version.split('-')[1];
  if (!segment) return Number.MAX_SAFE_INTEGER;
  const name = segment.split('.')[0].toLowerCase();
  return PRERELEASE_ORDER[name] ?? 0;
}

/** Compares two semver strings; returns < 0, 0 or > 0. */
export function compareVersionStrings(first: string, second: string): number {
  const left = parse(first);
  const right = parse(second);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta;
  }
  const prerelease = prereleaseRank(first) - prereleaseRank(second);
  return prerelease !== 0 ? prerelease : first.localeCompare(second);
}

/** Orders versions from newest to oldest. Invalid entries are appended. */
export function sortVersionStrings(versions: string[]): string[] {
  return [...versions].sort((a, b) => compareVersionStrings(b, a));
}

export function newestVersion(versions: string[]): string | null {
  const sorted = sortVersionStrings(versions);
  return sorted[0] ?? null;
}

export function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version);
}

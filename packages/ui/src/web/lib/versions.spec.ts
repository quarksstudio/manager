import {
  compareVersionStrings,
  isValidVersion,
  newestVersion,
  sortVersionStrings,
} from './versions';

describe('compareVersionStrings', () => {
  it('sorts by numeric core parts', () => {
    expect(compareVersionStrings('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersionStrings('2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersionStrings('1.2.0', '1.2.1')).toBeLessThan(0);
  });

  it('ranks prereleases below the release', () => {
    expect(compareVersionStrings('1.0.0-alpha', '1.0.0')).toBeLessThan(0);
    expect(compareVersionStrings('2.0.0-rc.1', '1.0.0')).toBeGreaterThan(0);
  });
});

describe('sortVersionStrings', () => {
  it('orders from newest to oldest', () => {
    expect(
      sortVersionStrings(['1.0.0', '2.3.4', '1.9.0', '0.5.0', '2.10.0']),
    ).toEqual(['2.10.0', '2.3.4', '1.9.0', '1.0.0', '0.5.0']);
  });
});

describe('newestVersion', () => {
  it('returns the highest version', () => {
    expect(newestVersion(['0.1.0', '1.2.3', '1.2.0'])).toBe('1.2.3');
  });

  it('returns null for an empty list', () => {
    expect(newestVersion([])).toBeNull();
  });
});

describe('isValidVersion', () => {
  it('accepts semver and rejects junk', () => {
    expect(isValidVersion('1.2.3')).toBe(true);
    expect(isValidVersion('1.2.3-rc.1')).toBe(true);
    expect(isValidVersion('2.0.0+meta')).toBe(true);
    expect(isValidVersion('v1.2.3')).toBe(false);
    expect(isValidVersion('1.2')).toBe(false);
    expect(isValidVersion('')).toBe(false);
  });
});

import { CERTIFICATION_TIERS, parseCertificationTier } from './types';

describe('parseCertificationTier', () => {
  it.each(CERTIFICATION_TIERS)('accepts %s', (tier) => {
    expect(parseCertificationTier(tier)).toBe(tier);
  });

  it.each(['', 'tier_1', 'TIER_5', 'S3'])('rejects %j', (tier) => {
    expect(() => parseCertificationTier(tier)).toThrow(
      'Expected one of: TIER_1, TIER_2, TIER_3, TIER_4',
    );
  });
});

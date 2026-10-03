import { heldTier } from '../../src/index';
import type { Certification } from '@quarks.studio/types/models';

const cert = (
  tier: Certification['tier'],
  status: Certification['status'],
): Certification => ({ tier, status });

describe('heldTier', () => {
  it('is zero when the version holds nothing', () => {
    expect(heldTier()).toBe(0);
    expect(heldTier([])).toBe(0);
    expect(heldTier(null)).toBe(0);
  });

  it('takes the highest approved tier', () => {
    expect(
      heldTier([cert('TIER_1', 'approved'), cert('TIER_3', 'approved')]),
    ).toBe(3);
  });

  /**
   * `failed` arrives as `pending` from the public API, so a failed audit still
   * locks. Being conservative costs a retry; being optimistic would sell a
   * certification the server refuses.
   */
  it('locks on a pending audit as well as an approved one', () => {
    expect(heldTier([cert('TIER_2', 'pending')])).toBe(2);
  });

  it('ignores a rejected tier', () => {
    expect(
      heldTier([cert('TIER_1', 'rejected'), cert('TIER_2', 'approved')]),
    ).toBe(2);
  });

  it('reads the number out of the tier name', () => {
    expect(heldTier([cert('TIER_4', 'approved')])).toBe(4);
  });
});

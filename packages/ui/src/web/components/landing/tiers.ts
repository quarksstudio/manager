import type { LandingTier } from './types';

export type TierColor =
  | 'default'
  | 'blue'
  | 'green'
  | 'gold'
  | 'magenta'
  | 'red'
  | 'volcano'
  | 'orange'
  | 'lime'
  | 'cyan'
  | 'geekblue'
  | 'purple';

export interface TierMeta {
  title: string;
  badge: string;
  color: TierColor;
}

export const TIER_META: Record<LandingTier, TierMeta> = {
  TIER_1: {
    title: 'Tier 1 - Basic Certification',
    badge: 'S1 Basic',
    color: 'default',
  },
  TIER_2: {
    title: 'Tier 2 - Standard Certification',
    badge: 'S2 Standard',
    color: 'blue',
  },
  TIER_3: {
    title: 'Tier 3 - Pro Certification',
    badge: 'S3 Pro',
    color: 'green',
  },
  TIER_4: {
    title: 'Tier 4 - Audited Certification',
    badge: 'S4 Gold',
    color: 'gold',
  },
};

export const TIER_ORDER: LandingTier[] = [
  'TIER_1',
  'TIER_2',
  'TIER_3',
  'TIER_4',
];

export function truncateHash(hash?: string): string {
  if (!hash) return '—';
  return `${hash.slice(0, 12)}…`;
}

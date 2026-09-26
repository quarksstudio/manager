import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { LandingHero } from '../../../../src/web/components/landing/LandingHero';
import { LandingTierMatrix } from '../../../../src/web/components/landing/LandingTierMatrix';
import { formatCount } from '../../../../src/web/lib/format';
import type {
  LandingTier,
  LandingTierColumns,
} from '../../../../src/web/components/landing/types';

const tiers: Record<LandingTier, LandingTierColumns> = {
  TIER_1: {
    mostViewed: [
      {
        name: 'cloud-vision',
        version: '1.0.0',
        href: '/package/cloud-vision',
        hash: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
        viewsCount: 9812,
      },
    ],
    mostDownloaded: [],
    latestCertified: [],
  },
  TIER_2: {
    mostViewed: [],
    mostDownloaded: [
      {
        name: 'rag-engine',
        version: '2.4.1',
        href: '/package/rag-engine',
        hash: '1122334455667788990011223344556677889900112233445566778899001122',
        downloadsCount: 5123,
      },
    ],
    latestCertified: [],
  },
  TIER_3: { mostViewed: [], mostDownloaded: [], latestCertified: [] },
  TIER_4: {
    mostViewed: [],
    mostDownloaded: [],
    latestCertified: [
      {
        name: 'fin-model-compiler',
        version: '0.9.0',
        href: '/package/fin-model-compiler',
        certifiedAt: '2026-09-20T00:00:00.000Z',
      },
    ],
  },
};

it('renders the hero, CTAs and blog link', () => {
  render(
    <LandingHero exploreUrl="/search" blogUrl="https://blog.quarks.studio" />,
  );
  expect(
    screen.getByRole('heading', {
      name: 'Formal Certification and Secure Distribution for AI Skills.',
    }),
  ).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Explore Registry' }).getAttribute('href'),
  ).toBe('/search');
  expect(
    screen
      .getByRole('link', { name: 'Read the Blog (.blog)' })
      .getAttribute('href'),
  ).toBe('https://blog.quarks.studio');
});

it('renders all four tier headers and badges', () => {
  render(<LandingTierMatrix tiers={tiers} />);
  expect(screen.getByText('Tier 1 - Basic Certification')).toBeTruthy();
  expect(screen.getByText('S1 Basic')).toBeTruthy();
  expect(screen.getByText('Tier 2 - Standard Certification')).toBeTruthy();
  expect(screen.getByText('S2 Standard')).toBeTruthy();
  expect(screen.getByText('Tier 3 - Pro Certification')).toBeTruthy();
  expect(screen.getByText('S3 Pro')).toBeTruthy();
  expect(screen.getByText('Tier 4 - Audited Certification')).toBeTruthy();
  expect(screen.getByText('S4 Gold')).toBeTruthy();
});

it('shows column rankings with truncated hashes, versions and metrics', () => {
  render(<LandingTierMatrix tiers={tiers} />);
  const viewLink = screen.getByRole('link', { name: 'cloud-vision' });
  expect(viewLink.getAttribute('href')).toBe('/package/cloud-vision');
  expect(screen.getByText(/^sha256:aabbccddeeff…$/)).toBeTruthy();
  expect(screen.getByText(formatCount(9812))).toBeTruthy();
  const downloadLink = screen.getByRole('link', { name: 'rag-engine' });
  expect(downloadLink.getAttribute('href')).toBe('/package/rag-engine');
  expect(screen.getByText(formatCount(5123))).toBeTruthy();
});

it('renders the latest certified column with dates', () => {
  render(<LandingTierMatrix tiers={tiers} />);
  expect(screen.getByRole('link', { name: 'fin-model-compiler' })).toBeTruthy();
  expect(screen.getAllByText('Latest Certified').length).toBe(4);
});

it('supports SSR', () => {
  const html = renderToString(<LandingTierMatrix tiers={tiers} />);
  expect(html).toContain('Tier 4 - Audited Certification');
  expect(html).toContain('S4 Gold');
});

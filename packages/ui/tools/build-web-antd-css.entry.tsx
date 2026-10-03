import { writeFile, mkdir, cp } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { renderToStaticMarkup } from 'react-dom/server';

import * as UI from '../src/web/index';

const HEX = '0123456789abcdef';
function hashname(seed) {
  let value = seed;
  let out = '';
  for (let i = 0; i < 64; i += 1) {
    value = (value * 31 + 7) % 0xffff;
    out += HEX[value % 16];
  }
  return out;
}

const names = [
  'cloud-vision',
  'rag-engine',
  'agent-coordinator',
  'fin-model-compiler',
];
const landing = Object.fromEntries(
  ['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'].map((tier, index) => {
    const items = names.slice(0, index + 1).map((name, at) => ({
      name,
      version: `1.${index}.${at}`,
      href: `/package/${name}`,
      hash: hashname(index * 100 + at),
      viewsCount: 9800 - at * 100,
      downloadsCount: 5200 - at * 50,
      certifiedAt: new Date(Date.UTC(2026, 8, 20 - at)).toISOString(),
    }));
    return [
      tier,
      {
        mostViewed: items,
        mostDownloaded: items,
        latestCertified: items,
      },
    ];
  }),
);

const detail = {
  id: 'demo',
  name: 'demo',
  description: 'Deterministic, audited AI skill package.',
  authors: ['alice', 'bob'],
  tags: ['camera', 'vision'],
  downloads: 1234,
  downloadsSince: '2026-08-01T00:00:00.000Z',
  canEditMetadata: true,
  versions: [
    {
      version: '1.0.0',
      date: '2026-09-01T00:00:00.000Z',
      signatures: [],
      certifications: [
        {
          tier: 'TIER_4',
          environment: 'local',
          status: 'approved',
          approvedAt: '2026-09-02T00:00:00.000Z',
          reportUrl: '/packages/demo/1.0.0/certificates/1',
        },
      ],
    },
    {
      version: '0.9.0',
      date: '2026-08-01T00:00:00.000Z',
      signatures: [],
      certifications: [
        { tier: 'TIER_2', status: 'pending' },
        { tier: 'TIER_1', status: 'rejected' },
      ],
    },
  ],
};

const readme = {
  content:
    '# README\n\nDeterministic package content.\n\x60\x60\x60sh\nquark add demo\n\x60\x60\x60\n',
  loading: false,
  version: '1.0.0',
};

const systems = [
  { id: 'paypal', name: 'PayPal', countries: null },
  { id: 'wompi', name: 'Wompi', countries: ['CO'] },
];

const plans = [
  {
    id: 'PL1',
    kind: 'plan',
    name: 'Monthly plan',
    description: 'Monthly credit for the package author.',
    amountCents: 900,
    currency: 'USD',
    country: null,
    tier: 0,
    active: true,
    features: ['Monthly credit'],
    period: 'month',
  },
  {
    id: 'PL2',
    kind: 'plan',
    name: 'Yearly plan',
    description: 'Twelve months at a lower price.',
    amountCents: 9000,
    currency: 'USD',
    country: null,
    tier: 0,
    active: false,
    features: ['Twelve months', 'Lower price'],
  },
];

const tiers = [1, 2, 3, 4].map((tier) => ({
  product: {
    id: `N${tier}`,
    kind: 'tier',
    name: `Tier ${tier}`,
    description: `Certification level ${tier}.`,
    amountCents: tier * 1000,
    currency: 'USD',
    country: null,
    tier,
    active: true,
    features: [`Includes level ${tier}`],
  },
  held: 0,
  purchasable: true,
}));

const subscription = {
  id: 'sub-1',
  productId: 'PL1',
  packageId: 'demo',
  userId: 'user-1',
  system: 'paypal',
  status: 'active',
  amountCents: 900,
  currency: 'USD',
  period: 'month',
  currentPeriodStart: '2026-09-01T00:00:00.000Z',
  currentPeriodEnd: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const cache = createCache();
renderToStaticMarkup(
  <StyleProvider cache={cache}>
    <UI.SiteNavbar
      logo="QUARK // SKILLS"
      searchAction="/search"
      searchPlaceholder="Search packages and skills..."
      loginUrl="/login"
    />
    <UI.LandingHero exploreUrl="/search" blogUrl="https://blog.quarks.studio" />
    <UI.LandingTierMatrix tiers={landing} />
    <UI.PackageDetails
      packageName="demo"
      detail={detail}
      selectedVersion="1.0.0"
      readme={readme}
      urls={{
        retry: '/packages/demo',
        versions: {
          '1.0.0': '/packages/demo/1.0.0',
          '0.9.0': '/packages/demo/0.9.0',
        },
        downloads: {
          '1.0.0': '/packages/demo/1.0.0/download',
          '0.9.0': '/packages/demo/0.9.0/download',
        },
        metadata: '/packages/demo/1.0.0',
      }}
      plans={{
        plans: [subscription],
        plansBase: '/packages/demo/payment',
        catalog: plans,
      }}
    />
    <UI.PackagePlansPanel
      packageName="demo"
      plans={[]}
      plansBase="/packages/demo/payment"
    />
    <UI.PricingModeNav mode="plans" baseUrl="/pricing" />
    <UI.PlanGrid
      plans={plans}
      systems={{
        eligible: [systems[0]],
        pending: [{ ...systems[1], reason: 'Needs a stored card first.' }],
      }}
      packageId="demo"
    />
    <UI.PlanGrid
      plans={[]}
      systems={{ eligible: [], pending: [] }}
      packageId="demo"
    />
    <UI.TierMatrix
      offers={tiers}
      systems={systems}
      packageId="demo"
      versionId="1.0.0"
    />
    <UI.TierMatrix
      offers={[]}
      systems={systems}
      packageId="demo"
      versionId="1.0.0"
    />
    <UI.SystemHints
      pending={[{ ...systems[1], reason: 'Needs a stored card first.' }]}
    />
    <UI.CertificationCta
      href="/packages/demo/1.0.0/payment"
      versionId="1.0.0"
      held={1}
    />
    <UI.PackageTabs
      packageName="demo2"
      detail={{ ...detail, id: 'demo2', name: 'demo2', canEditMetadata: true }}
      selectedVersion="1.0.0"
      readme={readme}
      formError="Forbidden"
      draft={{ description: 'Unsaved', authors: 'alice', tags: 'new' }}
      urls={{
        versions: {},
        downloads: {},
        metadata: '/packages/demo2/1.0.0',
      }}
    />
    <UI.ReadmeTab loading />
    <UI.ReadmeTab
      loading={false}
      content=""
      version="1.0.0"
      retryUrl="/packages/demo"
    />
    <UI.PackageSidebar
      packageName="demo"
      latestVersion="1.0.0"
      downloads={1234}
      downloadsSince="2026-08-01T00:00:00.000Z"
      authors={['alice', 'bob']}
      tags={['camera']}
      installCommand="quark add demo"
    />
    <UI.PackageStateNotice
      title="Package not found"
      description="No such package in the registry."
      onRetry={() => ({})}
    />
    <UI.PackageDetailsSkeleton />
    <UI.SiteFooter
      links={[
        { label: 'Documentation', href: 'https://docs.quarks.studio' },
        { label: 'Registry', href: '/search' },
        { label: 'Legal', href: '/terms' },
        { label: 'Blog', href: 'https://blog.quarks.studio' },
      ]}
    />
  </StyleProvider>,
);

const css = extractStyle(cache, { plain: true });
if (!css.includes('ant-btn') && !css.includes('fit-content')) {
  throw new Error(
    'Suspicious antd CSS output (no component rules): ' + css.slice(0, 200),
  );
}

const target = resolve('apps/ui/public/antd.css');
await mkdir(dirname(target), { recursive: true });
await writeFile(target, css);
console.log(`antd.css ${css.length} bytes -> ${target}`);

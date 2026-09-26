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

const names = ['cloud-vision', 'rag-engine', 'agent-coordinator', 'fin-model-compiler'];
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
  throw new Error('Suspicious antd CSS output (no component rules): ' + css.slice(0, 200));
}

const target = resolve('apps/ui/public/antd.css');
await mkdir(dirname(target), { recursive: true });
await writeFile(target, css);
console.log(`antd.css ${css.length} bytes -> ${target}`);
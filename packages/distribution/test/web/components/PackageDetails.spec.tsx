import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { PackageDetails } from '@quarks.studio/distribution/web';
const detail = {
  id: 'demo',
  name: 'demo',
  summary: 'Demo package',
  authors: ['alice'],
  tags: ['demo'],
  stats: { downloads: 42, views: 0, series: [] },
  latestVersion: '1.0.0',
  canEditMetadata: false,
  versions: [
    {
      version: '1.0.0',
      description: '# README',
      dist: { sha256: null, sizeBytes: 1 },
    },
  ],
};
const urls = {
  retry: '/packages/demo',
  versions: { '1.0.0': '/packages/demo/1.0.0' },
  downloads: { '1.0.0': '/packages/demo/1.0.0/download' },
  metadata: '/packages/demo/1.0.0',
};
it('renders server data and working version/download links without fetching', () => {
  render(
    <PackageDetails
      packageName="demo"
      detail={detail}
      selectedVersion="1.0.0"
      urls={urls}
    />,
  );
  expect(screen.getByRole('heading', { name: 'README' })).toBeTruthy();
  expect(screen.getByTestId('version').textContent).toBe('1.0.0');
  expect(screen.getByText('quark install demo@1.0.0')).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Versions' }));
  expect(
    screen
      .getByRole('link', { name: 'Download version 1.0.0' })
      .getAttribute('href'),
  ).toBe(urls.downloads['1.0.0']);
});
it('shows the viewed version and its install command, not the latest', () => {
  const older = {
    ...detail,
    versions: [
      detail.versions[0],
      {
        version: '0.9.0',
        description: '# Older README',
        dist: { sha256: null, sizeBytes: 1 },
      },
    ],
  };
  const olderUrls = {
    retry: '/packages/demo/0.9.0',
    versions: {
      '1.0.0': '/packages/demo/1.0.0',
      '0.9.0': '/packages/demo/0.9.0',
    },
    downloads: {
      '1.0.0': '/packages/demo/1.0.0/download',
      '0.9.0': '/packages/demo/0.9.0/download',
    },
    metadata: '/packages/demo/0.9.0',
  };
  render(
    <PackageDetails
      packageName="demo"
      detail={older}
      selectedVersion="0.9.0"
      urls={olderUrls}
    />,
  );
  expect(screen.getByTestId('version').textContent).toBe('0.9.0');
  expect(screen.getByText('quark install demo@0.9.0')).toBeTruthy();
});
it('renders the info box before the tabs so mobile sees it first', () => {
  const { container } = render(
    <PackageDetails
      packageName="demo"
      detail={detail}
      selectedVersion="1.0.0"
      urls={urls}
    />,
  );
  const sidebar = container.querySelector('[data-testid="package-sidebar"]');
  const tabs = container.querySelector('[data-testid="package-tabs"]');
  expect(sidebar).toBeTruthy();
  expect(tabs).toBeTruthy();
  const follows =
    sidebar && tabs
      ? sidebar.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING
      : 0;
  expect(follows).toBeTruthy();
});
it('renders a missing version with a latest-version link', () => {
  render(
    <PackageDetails
      packageName="demo"
      detail={detail}
      selectedVersion="missing"
      urls={urls}
    />,
  );
  expect(screen.getByText('Version not found')).toBeTruthy();
  expect(
    screen
      .getByRole('link', { name: 'See latest version (1.0.0)' })
      .getAttribute('href'),
  ).toBe(urls.versions['1.0.0']);
});
it('renders empty and not-found states', () => {
  const { rerender } = render(
    <PackageDetails
      packageName="demo"
      detail={{ ...detail, versions: [] }}
      urls={urls}
    />,
  );
  expect(screen.getByText('No published versions')).toBeTruthy();
  rerender(<PackageDetails packageName="demo" notFound urls={urls} />);
  expect(screen.getByText('Package not found')).toBeTruthy();
});
it('supports SSR with a sanitized README', () => {
  const html = renderToString(
    <PackageDetails
      packageName="demo"
      detail={{
        ...detail,
        versions: [
          {
            ...detail.versions[0],
            description: '# README\n<script>alert(1)</script>',
          },
        ],
      }}
      selectedVersion="1.0.0"
      urls={urls}
    />,
  );
  expect(html).toContain('<h1>README</h1>');
  expect(html).not.toContain('alert(1)');
});

it('hydrates SSR markup without replacing it or fetching data', async () => {
  const element = (
    <PackageDetails
      packageName="demo"
      detail={detail}
      selectedVersion="1.0.0"
      urls={urls}
    />
  );
  const container = document.createElement('div');
  container.innerHTML = renderToString(element);
  document.body.append(container);
  const errors: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, element, {
        onRecoverableError: (error) => errors.push(error),
      });
    });
    expect(errors).toEqual([]);
    expect(container.querySelector('#demo-versions')).toBeTruthy();
    expect(
      container
        .querySelector('[id$="-panel-versions"]')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

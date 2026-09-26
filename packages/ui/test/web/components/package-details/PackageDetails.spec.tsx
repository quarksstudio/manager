import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { PackageDetails } from '../../../../src/web/components/package-details/PackageDetails';
const detail = {
  id: 'demo',
  name: 'demo',
  description: 'Demo package',
  authors: ['alice'],
  tags: ['demo'],
  downloads: 42,
  canEditMetadata: false,
  versions: [{ version: '1.0.0' }],
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
      readme={{ content: '# README' }}
    />,
  );
  expect(screen.getByRole('heading', { name: 'README' })).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Versions' }));
  expect(
    screen
      .getByRole('link', { name: 'Download version 1.0.0' })
      .getAttribute('href'),
  ).toBe(urls.downloads['1.0.0']);
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
      detail={detail}
      selectedVersion="1.0.0"
      urls={urls}
      readme={{ content: '# README\n<script>alert(1)</script>' }}
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
      readme={{ content: '# README' }}
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

import { fireEvent, render, screen } from '@testing-library/react';

import { PackageTabs } from './PackageTabs';

jest.mock('@quark/registry', () => ({
  certificationsForVersion: () => [],
}));

jest.mock('./ReadmeTab', () => ({
  ReadmeTab: (props: {
    loading: boolean;
    version: string;
    onRetry: () => void;
  }) => (
    <div data-testid="readme-tab">
      readme {props.version} loading={String(props.loading)}
    </div>
  ),
}));

jest.mock('./VersionsTab', () => ({
  VersionsTab: (props: {
    packageName: string;
    selectedVersion: string;
    onSelectVersion: (version: string) => void;
    onDownload: (version: string) => void;
  }) => (
    <div data-testid="versions-tab">
      versions {props.selectedVersion}{' '}
      <button onClick={() => props.onSelectVersion('1.0.0')}>
        pick-version
      </button>
    </div>
  ),
}));

jest.mock('./CertsTab', () => ({
  CertsTab: (props: {
    selectedVersion: string;
    onSelectVersion: (version: string) => void;
  }) => <div data-testid="certs-tab">certs {props.selectedVersion}</div>,
}));

jest.mock('./ConfigTab', () => ({
  ConfigTab: () => <div data-testid="config-tab">config</div>,
}));

const DETAIL = {
  id: 'pkg',
  name: 'demo',
  description: 'A demo package',
  authors: ['alice'],
  tags: ['demo'],
  downloads: 10,
  canEditMetadata: false,
  versions: [{ version: '1.0.0' }, { version: '0.2.0' }],
};

describe('PackageTabs', () => {
  const onSelectVersion = jest.fn();
  const onDetailRefetch = jest.fn();
  const onDownload = jest.fn();

  it('renders the readme tab by default', () => {
    render(
      <PackageTabs
        packageName="demo"
        detail={DETAIL}
        selectedVersion="1.0.0"
        onSelectVersion={onSelectVersion}
        onDownload={onDownload}
        readme={{
          loading: false,
          error: null,
          content: '# hi',
          version: '1.0.0',
          onRetry: jest.fn(),
        }}
        onDetailRefetch={onDetailRefetch}
      />,
    );
    expect(screen.getByTestId('readme-tab')).toBeTruthy();
    expect(screen.queryByTestId('versions-tab')).toBeNull();
  });

  it('reports tab switches', () => {
    render(
      <PackageTabs
        packageName="demo"
        detail={DETAIL}
        selectedVersion="1.0.0"
        onSelectVersion={onSelectVersion}
        onDownload={onDownload}
        readme={{
          loading: false,
          error: null,
          content: '',
          version: '1.0.0',
          onRetry: jest.fn(),
        }}
        onDetailRefetch={onDetailRefetch}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Versions/ }));
    expect(screen.getByTestId('versions-tab')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Certs/ }));
    expect(screen.getByTestId('certs-tab')).toBeTruthy();
  });

  it('forwards version selection from the versions tab', () => {
    render(
      <PackageTabs
        packageName="demo"
        detail={DETAIL}
        selectedVersion="1.0.0"
        onSelectVersion={onSelectVersion}
        onDownload={onDownload}
        readme={{
          loading: false,
          error: null,
          content: '',
          version: '1.0.0',
          onRetry: jest.fn(),
        }}
        onDetailRefetch={onDetailRefetch}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Versions/ }));
    fireEvent.click(screen.getByText('pick-version'));
    expect(onSelectVersion).toHaveBeenCalledWith('1.0.0');
  });

  it('hides the config tab when the user cannot edit', () => {
    render(
      <PackageTabs
        packageName="demo"
        detail={DETAIL}
        selectedVersion="1.0.0"
        onSelectVersion={onSelectVersion}
        onDownload={onDownload}
        readme={{
          loading: false,
          error: null,
          content: '',
          version: '1.0.0',
          onRetry: jest.fn(),
        }}
        onDetailRefetch={onDetailRefetch}
      />,
    );
    expect(screen.queryByRole('tab', { name: /Config/ })).toBeNull();
  });

  it('shows the config tab for editable packages', () => {
    render(
      <PackageTabs
        packageName="demo"
        detail={{ ...DETAIL, canEditMetadata: true }}
        selectedVersion="1.0.0"
        onSelectVersion={onSelectVersion}
        onDownload={onDownload}
        readme={{
          loading: false,
          error: null,
          content: '',
          version: '1.0.0',
          onRetry: jest.fn(),
        }}
        onDetailRefetch={onDetailRefetch}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Config/ }));
    expect(screen.getByTestId('config-tab')).toBeTruthy();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';

import { ApiError } from '@quark/registry';

import { PackageDetails } from './PackageDetails';

const detailWithVersions = {
  id: 'demo',
  name: 'demo',
  description: 'Demo package',
  authors: ['alice'],
  tags: ['demo'],
  downloads: 42,
  downloadsSince: '2024-01-01T00:00:00Z',
  canEditMetadata: false,
  versions: [
    {
      version: '1.0.0',
      certifications: [{ tier: 'TIER_2', status: 'approved' }],
    },
  ],
};

let mockView: Record<string, unknown>;
const mockDownload = jest.fn();
const mockUsePackageDetailsView = jest.fn(() => mockView);

jest.mock('@quark/registry', () => ({
  ApiError: jest.requireActual('@quark/registry').ApiError,
}));

jest.mock('../../../hooks/usePackageDetailsView', () => ({
  usePackageDetailsView: (...args: unknown[]) => {
    mockUsePackageDetailsView.mock.lastCall = args;
    return mockView;
  },
}));

jest.mock('../../../hooks/usePackageDownload', () => ({
  usePackageDownload: () => ({ download: mockDownload }),
}));

jest.mock('../../../hooks/useReadmeCached', () => ({
  useReadmeCached: () => ({
    data: { content: '# readme' },
    error: null,
    loading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('./PackageTabs', () => ({
  PackageTabs: (props: {
    onDownload: (version: string) => void;
    onDetailRefetch: () => void;
    onSelectVersion: (version: string) => void;
  }) => (
    <div data-testid="package-tabs">
      <button onClick={() => props.onDownload('1.0.0')}>download</button>
      <button onClick={() => props.onDetailRefetch()}>refetch</button>
      <button onClick={() => props.onSelectVersion('9.9.9')}>
        bad version
      </button>
    </div>
  ),
}));

jest.mock('./PackageSidebar', () => ({
  PackageSidebar: () => <div data-testid="package-sidebar">sidebar</div>,
}));

describe('PackageDetails', () => {
  let mockRefetch: jest.Mock;

  beforeEach(() => {
    mockRefetch = jest.fn();
    mockDownload.mockReset();
    mockUsePackageDetailsView.mockClear();
    mockView = {
      packageName: 'demo',
      detail: detailWithVersions,
      loading: false,
      error: null,
      notFound: false,
      refetch: mockRefetch,
      versions: detailWithVersions.versions,
      latestVersion: '1.0.0',
      selectedVersion: '1.0.0',
      setSelectedVersion: jest.fn(),
      selectedCertifications: [],
      badge: { tier: 'TIER_2', label: 'Certified TIER_2' },
      canEdit: false,
      requestedVersion: '',
      versionNotFound: false,
    };
  });

  it('renders a skeleton while loading', () => {
    mockView.loading = true;
    render(<PackageDetails packageName="demo" />);
    expect(screen.getByTestId('package-loading')).toBeTruthy();
  });

  it('renders a not-found notice for a missing package', () => {
    mockView.notFound = true;
    mockView.error = new ApiError('GET', 404, 'Not Found');
    render(<PackageDetails packageName="nope" />);
    expect(screen.getByText('Package not found')).toBeTruthy();
  });

  it('renders an error state with the error message', () => {
    mockView.error = new Error('boom');
    render(<PackageDetails packageName="demo" />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('boom')).toBeTruthy();
  });

  it('retries via the notice button', () => {
    mockView.error = new Error('boom');
    render(<PackageDetails packageName="demo" />);
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders the full layout for an existing package', () => {
    render(<PackageDetails packageName="demo" />);
    expect(screen.getByText('demo')).toBeTruthy();
    expect(screen.getByTestId('package-tabs')).toBeTruthy();
    expect(screen.getByTestId('package-sidebar')).toBeTruthy();
  });

  it('wires the download callback through the tabs', () => {
    render(<PackageDetails packageName="demo" />);
    fireEvent.click(screen.getByText('download'));
    expect(mockDownload).toHaveBeenCalledWith('1.0.0');
  });

  it('shows an empty notice when a package has no versions', () => {
    mockView.detail = { ...detailWithVersions, versions: [] };
    mockView.versions = [];
    mockView.latestVersion = null;
    render(<PackageDetails packageName="demo" />);
    expect(screen.getByText('No published versions')).toBeTruthy();
  });

  it('passes options through to the view hook', () => {
    const onVersionChange = jest.fn();
    render(
      <PackageDetails
        packageName="demo"
        initialVersion="1.0.0"
        onVersionChange={onVersionChange}
      />,
    );
    expect(mockUsePackageDetailsView.mock.lastCall).toEqual([
      'demo',
      { initialVersion: '1.0.0', onVersionChange },
    ]);
  });

  it('renders a version-not-found notice', () => {
    mockView.versionNotFound = true;
    mockView.requestedVersion = '9.9.9';
    mockView.latestVersion = '1.0.0';
    render(
      <PackageDetails
        packageName="demo"
        initialVersion="9.9.9"
        onVersionChange={jest.fn()}
      />,
    );
    expect(screen.getByText('Version not found')).toBeTruthy();
    expect(
      screen.getByText(/Version "9.9.9" does not exist for "demo"/),
    ).toBeTruthy();
    expect(screen.getByTestId('see-latest-version')).toBeTruthy();
  });

  it('navigates to the latest version via the notice button', () => {
    const onVersionChange = jest.fn();
    mockView.versionNotFound = true;
    mockView.requestedVersion = '9.9.9';
    mockView.latestVersion = '1.0.0';
    render(
      <PackageDetails
        packageName="demo"
        initialVersion="9.9.9"
        onVersionChange={onVersionChange}
      />,
    );
    fireEvent.click(screen.getByTestId('see-latest-version'));
    expect(onVersionChange).toHaveBeenCalledWith('1.0.0');
  });

  it('omits the latest-version button when onVersionChange is absent', () => {
    mockView.versionNotFound = true;
    mockView.requestedVersion = '9.9.9';
    render(<PackageDetails packageName="demo" initialVersion="9.9.9" />);
    expect(screen.queryByTestId('see-latest-version')).toBeNull();
  });
});

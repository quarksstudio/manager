import { render, screen, waitFor } from '@testing-library/react';
import { DistributionWebProvider } from '../../../src/presentation/web-services';
import { PackagesBoundary } from '../../../src/web/containers/PackagesBoundary';
import type { PackageDetails } from '../../../src/domain/package-details';

jest.mock('../../../src/web/components/PackageDetails', () => ({
  PackageDetails: ({
    detail,
    selectedVersion,
  }: {
    detail?: PackageDetails;
    selectedVersion?: string;
  }) => (
    <div>
      {
        detail?.versions.find(
          (item) => item.version === (selectedVersion || detail.latestVersion),
        )?.description
      }
    </div>
  ),
}));
const detail: PackageDetails = {
  name: 'demo',
  summary: 'Short text',
  authors: ['alice'],
  tags: [],
  canEditMetadata: false,
  latestVersion: '1.0.0',
  versions: [
    {
      version: '2.0.0',
      description: '# Older publication',
      dist: { sha256: null, sizeBytes: 1 },
    },
    {
      version: '1.0.0',
      description: '# Latest publication',
      dist: { sha256: null, sizeBytes: 1 },
    },
  ],
};
const urls = {
  packageUrl: (name: string) => `/${name}`,
  downloadUrl: (name: string, version: string) =>
    `/${name}/${version}/download`,
};

it('gets the embedded description with one package request and uses the latest pointer', async () => {
  const get = jest.fn().mockResolvedValue(detail);
  render(
    <DistributionWebProvider services={{ get }}>
      <PackagesBoundary packageName="demo" {...urls} />
    </DistributionWebProvider>,
  );
  await screen.findByText('# Latest publication');
  expect(get).toHaveBeenCalledTimes(1);
});

it('uses server-provided data without repeating the package request on hydration', async () => {
  const get = jest.fn();
  const view = (version: string) => (
    <DistributionWebProvider services={{ get }}>
      <PackagesBoundary
        packageName="demo"
        initialDetail={detail}
        version={version}
        {...urls}
      />
    </DistributionWebProvider>
  );
  const { rerender } = render(view('1.0.0'));
  await screen.findByText('# Latest publication');
  rerender(view('2.0.0'));
  await waitFor(() =>
    expect(screen.getByText('# Older publication')).toBeTruthy(),
  );
  expect(get).not.toHaveBeenCalled();
});

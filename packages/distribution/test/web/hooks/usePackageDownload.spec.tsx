import { act, renderHook } from '@testing-library/react';
import { usePackageDownload } from '@quarks.studio/distribution/hooks';
import { DistributionProvider, type DistributionServices } from '@quarks.studio/distribution/presentation';

const downloadBundle = jest.fn();
const services: DistributionServices = {
  get: jest.fn(),
  getReadme: jest.fn(),
  update: jest.fn(),
  getCurrentUser: jest.fn(),
  downloadBundle,
};
const createUrl = jest.fn(() => 'blob:test');
const revokeUrl = jest.fn();
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
beforeEach(() => {
  downloadBundle.mockReset();
  createUrl.mockClear();
  revokeUrl.mockClear();
  URL.createObjectURL = createUrl;
  URL.revokeObjectURL = revokeUrl;
});
afterAll(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

it.each([false, true])(
  'cleans the download element and blob URL (click fails: %s)',
  async (fail) => {
    downloadBundle.mockResolvedValue({
      blob: async () => new Blob(['archive']),
    });
    let filename: string | undefined;
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        filename = this.download;
        if (fail) throw new Error('click failed');
      });
    const { result } = renderHook(() => usePackageDownload('@scope/package'), {
      wrapper: ({ children }) => (
        <DistributionProvider services={services}>
          {children}
        </DistributionProvider>
      ),
    });
    await act(async () => {
      const promise = result.current.download('1.0.0');
      if (fail) await expect(promise).rejects.toThrow('click failed');
      else await promise;
    });
    expect(downloadBundle).toHaveBeenCalledWith('@scope/package', '1.0.0');
    expect(filename).toBe('scope-package-1.0.0.tar.gz');
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeUrl).toHaveBeenCalledWith('blob:test');
    click.mockRestore();
  },
);

import type { VerificationResult } from '@quark/tester';
import { createPublishPackage } from './publish-package';
import type { PublisherDependencies } from './ports';
import {
  VerificationFailure,
  type PublishProgress,
} from '../domain/publication';

const source = {
  root: '/project',
  kind: 'skill' as const,
  packageName: 'demo',
  version: '1.0.0',
  manifest: { description: 'demo', dependencies: { child: '1.0.0' } },
};
const verified: VerificationResult = {
  packageName: 'demo',
  version: '1.0.0',
  packageType: 'skill',
  tierRequested: 'TIER_1',
  tierAchieved: 'TIER_1',
  passed: true,
  sha256Hash: 'hash',
  coverage: {
    schemaCoverage: 100,
    assertionCoverage: 100,
    invariantCoverage: 100,
    evaluatedPaths: [],
    missingPaths: [],
  },
  durationMs: 1,
  errors: [],
};
function dependencies() {
  return {
    project: {
      inspect: jest.fn().mockResolvedValue(source),
      writeSnapshot: jest.fn().mockResolvedValue(undefined),
      readArchive: jest.fn().mockResolvedValue({
        fileName: 'demo.tgz',
        content: new Uint8Array([1]),
      }),
    },
    verifier: { verify: jest.fn().mockResolvedValue(verified) },
    packager: { pack: jest.fn().mockResolvedValue('/archives/demo.tgz') },
    uploader: { upload: jest.fn().mockResolvedValue(undefined) },
    now: () => '2026-01-01T00:00:00.000Z',
  } satisfies PublisherDependencies;
}

describe('publication workflow', () => {
  it('verifies, writes the compatible snapshot, packs and uploads in order', async () => {
    const deps = dependencies();
    const progress: PublishProgress[] = [];
    const result = await createPublishPackage(deps)(
      { token: 'explicit', tier: 'TIER_2', outputDir: '/archives' },
      (event) => progress.push(event),
    );
    expect(result).toEqual({
      archive: '/archives/demo.tgz',
      packageName: 'demo',
      version: '1.0.0',
      passed: true,
      uploaded: true,
    });
    expect(deps.verifier.verify).toHaveBeenCalledWith(source, 'TIER_2');
    expect(deps.project.writeSnapshot).toHaveBeenCalledWith(source, {
      lockfileVersion: 1,
      integrity: 'sha256-hash',
      isCertified: false,
      generatedAt: deps.now(),
      localVerification: verified,
      dependencies: { child: '1.0.0' },
    });
    expect(deps.uploader.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'explicit',
        packageName: 'demo',
        version: '1.0.0',
        description: 'demo',
        fileName: 'demo.tgz',
      }),
    );
    expect(
      progress
        .filter((event) => event.status === 'active')
        .map((event) => event.stage),
    ).toEqual(['validate', 'verify', 'pack', 'upload']);
  });
  it.each([{ dryRun: true }, { upload: false }])(
    'packages without reading or uploading the archive: %j',
    async (options) => {
      const deps = dependencies();
      await expect(createPublishPackage(deps)(options)).resolves.toMatchObject({
        uploaded: false,
      });
      expect(deps.project.writeSnapshot).toHaveBeenCalled();
      expect(deps.packager.pack).toHaveBeenCalled();
      expect(deps.project.readArchive).not.toHaveBeenCalled();
      expect(deps.uploader.upload).not.toHaveBeenCalled();
    },
  );
  it('stops before any write when verification fails', async () => {
    const deps = dependencies();
    deps.verifier.verify.mockResolvedValue({
      ...verified,
      passed: false,
      errors: ['invalid'],
    });
    await expect(createPublishPackage(deps)()).rejects.toBeInstanceOf(
      VerificationFailure,
    );
    expect(deps.project.writeSnapshot).not.toHaveBeenCalled();
    expect(deps.packager.pack).not.toHaveBeenCalled();
    expect(deps.uploader.upload).not.toHaveBeenCalled();
  });
  it.each([
    'inspect',
    'writeSnapshot',
    'readArchive',
    'pack',
    'upload',
  ] as const)(
    'propagates %s failures and marks the active stage as failed',
    async (operation) => {
      const deps = dependencies();
      const failure = new Error(operation);
      const target =
        operation === 'pack'
          ? deps.packager.pack
          : operation === 'upload'
            ? deps.uploader.upload
            : deps.project[operation];
      target.mockRejectedValue(failure);
      const events: PublishProgress[] = [];
      await expect(
        createPublishPackage(deps)({}, (event) => events.push(event)),
      ).rejects.toBe(failure);
      expect(events[events.length - 1]).toMatchObject({
        status: 'error',
        detail: operation,
      });
      if (operation !== 'upload')
        expect(deps.uploader.upload).not.toHaveBeenCalled();
      if (operation === 'writeSnapshot')
        expect(deps.packager.pack).not.toHaveBeenCalled();
    },
  );
});

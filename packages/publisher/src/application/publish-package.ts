import {
  VerificationFailure,
  type PublishOptions,
  type PublishProgress,
  type PublishResult,
} from '../domain/publication';
import type { PublisherDependencies } from './ports';

export function createPublishPackage(dependencies: PublisherDependencies) {
  return async function publishPackage(
    options: PublishOptions = {},
    onProgress: (progress: PublishProgress) => void = () => undefined,
  ): Promise<PublishResult> {
    let stage: PublishProgress['stage'] = 'validate';
    const progress = (status: PublishProgress['status'], detail?: string) =>
      onProgress({ stage, status, detail });
    try {
      progress('active');
      const source = await dependencies.project.inspect(options.sourceDir);
      progress('success', `${source.packageName}@${source.version}`);

      stage = 'verify';
      progress('active');
      const verification = await dependencies.verifier.verify(
        source,
        options.tier ?? 'TIER_1',
      );
      if (!verification.passed) {
        throw new VerificationFailure(
          `Verification failed: ${verification.errors.join('; ')}`,
        );
      }
      progress('success', `passed ${verification.tierAchieved}`);

      stage = 'pack';
      progress('active');
      await dependencies.project.writeSnapshot(source, {
        lockfileVersion: 1,
        integrity: `sha256-${verification.sha256Hash}`,
        isCertified: false,
        generatedAt: dependencies.now(),
        localVerification: verification,
        dependencies: source.manifest['dependencies'] ?? {},
      });
      const archive = await dependencies.packager.pack(
        source,
        options.outputDir,
      );
      progress('success');

      stage = 'upload';
      const uploaded = (options.upload ?? true) && !(options.dryRun ?? false);
      if (uploaded) {
        progress('active');
        const contents = await dependencies.project.readArchive(archive);
        await dependencies.uploader.upload({
          ...contents,
          packageName: verification.packageName,
          version: verification.version,
          description: String(source.manifest['description'] ?? ''),
          token: options.token,
        });
        progress('success');
      } else {
        progress('skipped', options.dryRun ? 'dry run' : 'upload disabled');
      }
      return {
        archive,
        packageName: source.packageName,
        version: source.version,
        passed: true,
        uploaded,
      };
    } catch (error) {
      progress('error', error instanceof Error ? error.message : String(error));
      throw error;
    }
  };
}

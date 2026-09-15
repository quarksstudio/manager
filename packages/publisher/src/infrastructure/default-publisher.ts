import { runAgentTests, runSkillTests } from '@quarks.studio/tester';
import { pack } from '@quarks.studio/targz';
import { uploadPackageArchive } from '@quarks.studio/registry/upload';
import { createPublishPackage } from '../application/publish-package';
import { nodeProject } from './node-project';

export const publishPackage = createPublishPackage({
  project: nodeProject,
  verifier: {
    verify: (source, tierRequested) =>
      (source.kind === 'agent' ? runAgentTests : runSkillTests)({
        targetDir: source.root,
        tierRequested,
      }),
  },
  packager: {
    pack: (source, outputDir) => pack(source.root, outputDir ?? process.cwd()),
  },
  uploader: { upload: uploadPackageArchive },
  now: () => new Date().toISOString(),
});

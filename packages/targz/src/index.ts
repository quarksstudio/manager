export { check, pack, unpack } from './targz';
export {
  validateSchema,
  parseYaml,
  stringifyYaml,
  type SkillsManifest,
  type ValidatedManifest,
} from './manifest';

export interface ArchiveInspection {
  hash: string;
  sizeBytes: number;
  files: string[];
  manifest: {
    name: string;
    version: string;
    description: string;
    runtime?: 'node' | 'python';
    testCommand: string;
    mapper_files?: Record<
      string,
      {
        agents?: Record<string, string>;
        tools?: Record<string, string>;
      }
    >;
    dependencies?: Record<string, string>;
  };
}

type InspectPackageArchive = (
  buffer: Buffer,
  expected: { name: string; version: string },
) => Promise<ArchiveInspection>;

const tester = require('@quark/tester') as {
  inspectPackageArchive: InspectPackageArchive;
};

export const inspect: InspectPackageArchive = tester.inspectPackageArchive;

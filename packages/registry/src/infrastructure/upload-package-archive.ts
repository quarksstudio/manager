/**
 * The published `@quarks.studio/registry/upload` entrypoint resolves to this
 * exact path, and both the adapter and the endpoint reader moved to their new
 * homes. Kept as a re-export so the subpath, its compiled location and every
 * existing import of it keep working.
 */
export {
  uploadPackageArchive,
  type UploadPackageArchiveInput,
} from '@quarks.studio/publisher/upload';
export { registryConfiguration } from '../composition/registry-configuration';

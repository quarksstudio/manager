import { Client } from './composition/ambient-client';

export { Client };
export {
  filterPackages,
  searchPackages,
  type HybridSearchResult,
  type PackageSearchItem,
  type RemoteSearchPage,
  type SearchFilters,
  type SearchOptions,
} from './composition/ambient-search';
export {
  AUTH_SESSION_KEY,
  apiFetch,
  apiRequest,
  ApiError,
  type ApiFetchOptions,
} from './composition/ambient-context';
export {
  type AuthProvider,
  type AuthSession,
  type AuthStep,
  type LoginOptions,
  type LoginStrategy,
} from './identity/domain/auth-session';
export { loginWithProvider } from './composition/ambient-login';
export { registerAuditorPasskey, signAuditDecision } from './composition/ambient-certification';
export {
  useCurrentUser,
  useAuthLogout,
  useAuthLogin,
  useFetchPackage,
  usePackageReadme,
  usePackageCertifications,
  useUpdatePackageMetadata,
  useRegistryClient,
  useSearchPackages,
  type RegistryClient,
  type RegistryQuery,
  type UseSearchPackagesReturn,
  type UseAuthLoginReturn,
  type UsePackageCertificationsReturn,
  type UseUpdatePackageMetadataReturn,
} from './hooks';
export {
  sortVersions,
  highestVersion,
  compareVersions,
  certificationsForVersion,
  type PackageDetails,
  type PackageVersion,
  type PackageReadme,
  type UpdatePackageMetadataInput,
} from './distribution/domain/package-details';
export type { Certification } from '@quarks.studio/types/models';

export default function client(e = '') {
  return new Client(e);
}

export {
  uploadPackageArchive,
  type UploadPackageArchiveInput,
} from './publication/infrastructure/upload-package-archive';

export { loginWithEmulator } from './composition/ambient-login';

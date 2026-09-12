import { Client } from './lib';

export { Client };
export { configureRegistry } from './configuration';
export {
  filterPackages,
  searchPackages,
  type HybridSearchResult,
  type PackageSearchItem,
  type RemoteSearchPage,
  type SearchFilters,
  type SearchOptions,
} from './search-packages';
export {
  AUTH_SESSION_KEY,
  apiFetch,
  apiRequest,
  ApiError,
  type ApiFetchOptions,
} from './lib/api-fetch';
export {
  loginWithProvider,
  type AuthProvider,
  type AuthSession,
  type AuthStep,
  type LoginOptions,
  type LoginStrategy,
} from './auth-login';
export { registerAuditorPasskey, signAuditDecision } from './auditor-webauthn';
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
} from './package-details';
export type { Certification } from '@quark/types/models';

export default function client(e = '') {
  return new Client(e);
}

export {
  uploadPackageArchive,
  type UploadPackageArchiveInput,
} from './infrastructure/upload-package-archive';

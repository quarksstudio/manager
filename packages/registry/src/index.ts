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
} from '@quarks.studio/identity';
export { loginWithProvider } from './composition/ambient-login';
export {
  registerAuditorPasskey,
  signAuditDecision,
} from './composition/ambient-certification';
export {
  useCurrentUser,
  useAuthLogout,
  useAuthLogin,
  useFetchPackage,
  usePackageReadme,
  usePackageCertifications,
  usePaymentLink,
  useUpdatePackageMetadata,
  useRegistryClient,
  useSearchPackages,
  type RegistryClient,
  type RegistryQuery,
  type UseSearchPackagesReturn,
  type UseAuthLoginReturn,
  type UsePackageCertificationsReturn,
  type UsePaymentLinkOptions,
  type UsePaymentLinkReturn,
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
} from '@quarks.studio/distribution';
export type { Certification } from '@quarks.studio/types/models';

export { browsePlans, browseTierLadder } from '@quarks.studio/commerce';
export type { CatalogRemote } from '@quarks.studio/commerce';
export {
  isPlanProduct,
  isTierProduct,
  tierName,
  type CatalogProduct,
  type ProductKind,
} from '@quarks.studio/commerce';
export { formatPrice } from '@quarks.studio/commerce';
export {
  hasTierOverlap,
  isPurchasable,
  sortByPrice,
  type TierOffer,
} from '@quarks.studio/commerce';
export {
  partitionPlanSystems,
  planSignupNote,
  type PaymentSystem,
  type PaymentSystems,
  type PendingSystem,
  type PlanSystems,
} from '@quarks.studio/commerce';
export {
  paymentLinkPath,
  type PaymentLinkRequest,
  type PaymentLinkTarget,
} from '@quarks.studio/commerce';
export {
  paymentLinkFailure,
  type PaymentLinkFailure,
} from '@quarks.studio/commerce';
export { heldTier } from '@quarks.studio/certification';
export type {
  CreatedSubscription,
  PaymentLink,
  SubscriptionCancelResult,
  SubscriptionRecord,
} from '@quarks.studio/commerce';

export default function client(e = '') {
  return new Client(e);
}

export {
  uploadPackageArchive,
  type UploadPackageArchiveInput,
} from '@quarks.studio/publisher/upload';

export { loginWithEmulator } from './composition/ambient-login';

export type {
  PaymentRecord,
  PaymentPage,
  PaymentListOptions,
} from '@quarks.studio/commerce';
export { usePayments, type UsePaymentsReturn } from './hooks';

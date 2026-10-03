import { useMemo } from 'react';
import { loadConfig } from '@quarks.studio/config';
import { heldTier } from '@quarks.studio/certification';
import { RegistryHttpError } from '@quarks.studio/types/http';
import { CommerceProvider, type CommerceServices } from '@quarks.studio/commerce/react';
import {
  BillingBoundary as BillingView,
  PricingBoundary as PricingView,
  CommerceWebProvider,
  PackagePlansPanel,
  type PricingBoundaryProps as PricingViewProps,
  type PackagePlansPanelProps,
} from '@quarks.studio/commerce/web';
import {
  PackagesBoundary as PackagesView,
  PackageDetails as DetailsView,
  DistributionWebProvider,
  type PackageDetailsProps as DetailsViewProps,
} from '@quarks.studio/distribution/web';
import {
  LandingBoundary as LandingView,
  PackageSearchWebProvider,
} from '@quarks.studio/package-search/web';
import { createRegistryClient } from '../client';

export function packageUrl(name: string, version?: string) {
  return `/packages/${encodeURIComponent(name)}${version ? `/${encodeURIComponent(version)}` : ''}`;
}
function downloadUrl(name: string, version: string) {
  return `${packageUrl(name, version)}/download`;
}
function navigate(url: string) {
  window.location.replace(url);
}
function useClient(apiBaseUrl: string) {
  return useMemo(() => createRegistryClient({ baseUrl: apiBaseUrl }), [apiBaseUrl]);
}
function useCommerceServices(client: ReturnType<typeof createRegistryClient>, apiBaseUrl: string) {
  return useMemo<CommerceServices>(() => ({
    createPaymentLink: async (system, target, baseUrl) => {
      const { config } = await loadConfig();
      return createRegistryClient({
        baseUrl: baseUrl ?? apiBaseUrl,
        token: config.token,
      }).Gateway.createPaymentLink(system, target);
    },
    listPayments: (options) => client.Gateway.listPayments(options),
  }), [client, apiBaseUrl]);
}

export interface BillingBoundaryProps {
  paymentsUrl: string;
}
export function BillingBoundary({ paymentsUrl }: BillingBoundaryProps) {
  const services = useMemo<CommerceServices>(() => ({
    createPaymentLink: async (system, target) => {
      const { config } = await loadConfig();
      return createRegistryClient({ baseUrl: config.registryUrl, token: config.token })
        .Gateway.createPaymentLink(system, target);
    },
    listPayments: async (options = {}) => {
      const { config } = await loadConfig();
      const query = new URLSearchParams();
      if (options.limit !== undefined) query.set('limit', String(options.limit));
      if (options.cursor !== undefined) query.set('cursor', options.cursor);
      const separator = paymentsUrl.includes('?') ? '&' : '?';
      const response = await fetch(`${paymentsUrl}${separator}${query}`, {
        headers: config.token ? { Authorization: `Bearer ${config.token}` } : {},
        cache: 'no-store',
      });
      if (!response.ok) throw new RegistryHttpError(response.status, response.statusText);
      return response.json();
    },
  }), [paymentsUrl]);
  return <CommerceProvider services={services}><BillingView /></CommerceProvider>;
}

export interface PricingBoundaryProps extends Omit<PricingViewProps, 'apiBaseUrl'> {
  apiBaseUrl: string;
}
export function PricingBoundary({ apiBaseUrl, ...props }: PricingBoundaryProps) {
  const client = useClient(apiBaseUrl);
  const commerce = useCommerceServices(client, apiBaseUrl);
  const pricing = useMemo(() => ({
    catalog: client.Catalog,
    listSystems: () => client.Gateway.listSystems(),
    getHeldTier: async (name: string, versionId?: string) => {
      const detail = await client.Packages.get(name);
      return heldTier(detail.versions?.find((version) => version.version === versionId)?.certifications);
    },
  }), [client]);
  return <CommerceProvider services={commerce}>
    <CommerceWebProvider services={pricing}>
      <PricingView {...props} apiBaseUrl={apiBaseUrl} />
    </CommerceWebProvider>
  </CommerceProvider>;
}
export interface PackagesBoundaryProps {
  apiBaseUrl: string;
  packageName: string;
  version?: string;
}
export function PackagesBoundary({ apiBaseUrl, ...props }: PackagesBoundaryProps) {
  const client = useClient(apiBaseUrl);
  const services = useMemo(() => ({
    get: (name: string) => client.Packages.get(name),
    getReadme: (name: string, version: string) => client.Packages.getReadme(name, version),
  }), [client]);
  return <DistributionWebProvider services={services}>
    <PackagesView {...props} packageUrl={packageUrl} downloadUrl={downloadUrl} navigate={navigate} />
  </DistributionWebProvider>;
}
export interface LandingBoundaryProps {
  apiBaseUrl: string;
  blogUrl: string;
  exploreUrl?: string;
}
export function LandingBoundary({ apiBaseUrl, blogUrl, exploreUrl = '/search' }: LandingBoundaryProps) {
  const client = useClient(apiBaseUrl);
  const services = useMemo(() => ({ search: () => client.Packages.search() }), [client]);
  return <PackageSearchWebProvider services={services}>
    <LandingView blogUrl={blogUrl} exploreUrl={exploreUrl} packageUrl={packageUrl} />
  </PackageSearchWebProvider>;
}

/** Compatible detail view, composing the optional commercial panel. */
export interface PackageDetailsProps extends DetailsViewProps {
  plans?: Omit<PackagePlansPanelProps, 'packageName'>;
}
export function PackageDetails({ plans, commercialPanel, ...props }: PackageDetailsProps) {
  return <DetailsView {...props} commercialPanel={commercialPanel ?? (
    plans ? <PackagePlansPanel packageName={props.packageName} {...plans} /> : undefined
  )} />;
}

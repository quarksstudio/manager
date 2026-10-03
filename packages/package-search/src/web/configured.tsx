import { LandingBoundary as LandingView } from './LandingBoundary';
import { PackageSearchWebProvider } from './services';
import { useLandingServices } from '../hooks/useLandingServices';
export function packageUrl(name: string, version?: string) {
  return `/packages/${encodeURIComponent(name)}${version ? `/${encodeURIComponent(version)}` : ''}`;
}
export interface LandingBoundaryProps {
  apiBaseUrl: string;
  blogUrl: string;
  exploreUrl?: string;
}
export function ConfiguredLandingBoundary({
  apiBaseUrl,
  blogUrl,
  exploreUrl = '/search',
}: LandingBoundaryProps) {
  const services = useLandingServices(apiBaseUrl);
  return (
    <PackageSearchWebProvider services={services}>
      <LandingView
        blogUrl={blogUrl}
        exploreUrl={exploreUrl}
        packageUrl={packageUrl}
      />
    </PackageSearchWebProvider>
  );
}

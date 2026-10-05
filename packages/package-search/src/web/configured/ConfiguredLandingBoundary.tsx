import { LandingBoundary as LandingView } from '../containers/LandingBoundary';
import { PackageSearchWebProvider } from '../../presentation/web-services';
import { useLandingServices } from '../../hooks/useLandingServices';
import { packageUrl } from '../lib/package-links';

export interface LandingBoundaryProps {
  apiBaseUrl: string;
  blogUrl: string;
  exploreUrl?: string;
}

export function ConfiguredLandingBoundary({
  apiBaseUrl,
  blogUrl,
  exploreUrl = '/?query=',
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

import { searchPackages, fetchRemotePackages } from '../configured';
export function createPackageSearchServices() {
  return { searchPackages, fetchRemotePackages };
}

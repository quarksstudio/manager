import { createConfiguredContext } from '@quarks.studio/config/http';
import { loadSession } from '@quarks.studio/config';
import { createHttpPackageRegistry } from '../http';
import type { DistributionServices } from './services';
export function createDistributionServices(): DistributionServices {
  const context = createConfiguredContext();
  const gateway = createHttpPackageRegistry(context);
  return {
    ...gateway,
    getCurrentUser: async () => {
      const user = (await loadSession())?.user;
      return user ? { id: user.uid } : null;
    },
  };
}

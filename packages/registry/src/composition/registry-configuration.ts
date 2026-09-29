import { getConfig } from '@quarks.studio/config';

/**
 * Live read of the resolved configuration. The endpoint comes from the
 * configuration like every other value: override it with `QUARK_REGISTRY_URL`
 * or persist it with `quark config set registryUrl`, never by assignment.
 */
export const registryConfiguration = {
  get registryUrl(): string {
    return getConfig().registryUrl;
  },
};

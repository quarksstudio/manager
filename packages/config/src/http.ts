export * from './infrastructure/http-context';
export const registryConfiguration = {
  get registryUrl(): string {
    return getConfig().registryUrl;
  },
};
import { getConfig } from './index';
export function createConfiguredContext(baseUrl?: string): OperationContext {
  return {
    baseUrl: baseUrl ?? registryConfiguration.registryUrl,
    request: (path, options) =>
      createGlobalContext({
        baseUrl: baseUrl ?? registryConfiguration.registryUrl,
      }).then((context) => context.request(path, options)),
    fetchJson: (path, options) =>
      createGlobalContext({
        baseUrl: baseUrl ?? registryConfiguration.registryUrl,
      }).then((context) => context.fetchJson(path, options)),
  };
}
import type { OperationContext } from '@quarks.studio/registry/http';
import { createGlobalContext } from './infrastructure/http-context';

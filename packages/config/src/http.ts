import type { OperationContext } from '@quarks.studio/registry/http';
import { getConfig } from './index';
import { createGlobalContext } from './infrastructure/http-context';
export * from './infrastructure/http-context';

/** Lazy transport for synchronous service factories; requests resolve configuration. */
export function createConfiguredContext(baseUrl?: string): OperationContext {
  return {
    // This synchronous metadata is never used to select a request endpoint.
    get baseUrl() {
      return baseUrl ?? getConfig().registryUrl;
    },
    request: (path, options) =>
      createGlobalContext({ baseUrl }).then((context) =>
        context.request(path, options),
      ),
    fetchJson: (path, options) =>
      createGlobalContext({ baseUrl }).then((context) =>
        context.fetchJson(path, options),
      ),
  };
}

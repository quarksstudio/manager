import type { OperationContext } from '@quarks.studio/registry/http';
import type { PackageDetails, PackageVersion } from '../domain/package-details';
import type {
  PackageRegistry,
  SearchResult,
  UpdatePackageInput,
} from '../application/package-registry.port';

/**
 * The registry's own `package` namespace. The port lives in the application
 * layer, so the use cases that consume it never learn a route.
 */
export function createHttpPackageRegistry(
  context: OperationContext,
): PackageRegistry {
  const bundlePath = (name: string, version: string) =>
    `package/${encodeURIComponent(name)}/${encodeURIComponent(version)}/bundle`;
  return {
    search: (query = ''): Promise<SearchResult> =>
      context.fetchJson(`package?query=${encodeURIComponent(query)}`),

    get: (name): Promise<PackageDetails> =>
      context.fetchJson(`package/${encodeURIComponent(name)}`),

    getVersion: (name, version): Promise<PackageVersion> =>
      context.fetchJson(
        `package/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
      ),

    getBundleUrl: (name, version) =>
      `${context.baseUrl.replace(/\/$/, '')}/${bundlePath(name, version)}`,
    downloadBundle: (name, version) =>
      context.request(bundlePath(name, version)),

    update: (input, isNew = false) => update(context, input, isNew),

    createVersion: (name, body): Promise<PackageDetails> =>
      context.fetchJson(
        `package/${encodeURIComponent(name)}/${encodeURIComponent(body.version)}`,
        { method: 'POST', body },
      ),

    proxy: async (name, path) =>
      (await context.request(`package/${encodeURIComponent(name)}/${path}`))
        .body,
  };
}

/** A new package posts to the collection; an existing one patches its entry. */
function update(
  context: OperationContext,
  { id, ...body }: UpdatePackageInput,
  isNew: boolean,
): Promise<PackageDetails> {
  return context.fetchJson(`package/${isNew ? '' : encodeURIComponent(id)}`, {
    method: isNew ? 'POST' : 'PATCH',
    body,
  });
}

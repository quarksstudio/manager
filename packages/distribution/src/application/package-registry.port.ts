import type { PackageDetails, PackageVersion } from '../domain/package-details';

export interface SearchResult {
  items: Array<{ name: string }>;
}

export interface UpdatePackageInput {
  id: string;
  [key: string]: unknown;
}

export interface CreateVersionInput {
  version: string;
  [key: string]: unknown;
}

/**
 * The port every package-distribution use case depends on.
 *
 * `update` and `createVersion` are the two write shapes the registry exposes,
 * and the read methods answer with the domain's `PackageDetails` rather than a
 * wire type, so a use case never has to know the route it came from.
 */
export interface PackageRegistry {
  search(query?: string): Promise<SearchResult>;
  get(name: string): Promise<PackageDetails>;
  getVersion(name: string, version: string): Promise<PackageVersion>;
  getBundleUrl(name: string, version: string): string;
  downloadBundle(name: string, version: string): Promise<Response>;
  update(input: UpdatePackageInput, isNew?: boolean): Promise<PackageDetails>;
  createVersion(
    name: string,
    body: CreateVersionInput,
  ): Promise<PackageDetails>;
  /** The registry's raw asset proxy; the caller consumes the body stream. */
  proxy(name: string, path: string): Promise<ReadableStream<Uint8Array> | null>;
}

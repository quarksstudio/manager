export type { UpdatePackageMetadataInput } from '@quarks.studio/registry/domain';

export function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, '-').toLowerCase();
}

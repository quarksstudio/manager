/** The description/tags/authors shape the metadata editor edits. */
export interface UpdatePackageMetadataInput {
  id: string;
  description: string;
  tags: string[];
  authors: string[];
}

export function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, '-').toLowerCase();
}

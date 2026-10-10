/** The description/authors/visibility shape the metadata editor edits. */
export interface UpdatePackageMetadataInput {
  id: string;
  description: string;
  authors: string[];
  isPrivate: boolean;
}

export function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, '-').toLowerCase();
}

/** The description/tags/authors shape the metadata editor edits. */
export interface UpdatePackageMetadataInput {
  id: string;
  description: string;
  tags: string[];
  authors: string[];
}

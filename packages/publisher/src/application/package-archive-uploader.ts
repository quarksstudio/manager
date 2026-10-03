export interface UploadPackageArchiveInput {
  content: Uint8Array;
  fileName: string;
  packageName: string;
  version: string;
  description: string;
  token?: string;
}

/** What the registry hands back to authorize one direct-to-storage upload. */
export interface UploadAuthorization {
  uploadId: string;
  uploadUrl: string;
  expiresAt: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  maxSizeBytes: number;
}

/** Puts the archive where storage will take it, not where the registry serves it. */
export interface PackageArchiveUploader {
  upload(input: UploadPackageArchiveInput): Promise<void>;
}

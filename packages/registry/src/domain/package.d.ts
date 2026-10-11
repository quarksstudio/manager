export type CertificationTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';
export type CertificationStatus = 'approved' | 'pending' | 'rejected';

export interface CertificationCheck {
  name: string;
  passed: boolean;
}

export interface Certification {
  environment?: 'local';
  tier: CertificationTier;
  status: CertificationStatus;
  approvedAt?: string;
  reviewedBy?: string;
  reportUrl?: string;
  checks?: CertificationCheck[];
  logUrl?: string;
}

export interface PackageStats {
  views: number;
  downloads: number;
  series: Array<{ time: string; views: number; downloads: number }>;
}

export interface PackageVersion {
  version: string;
  description: string;
  publishedAt?: string;
  publishedBy?: string;
  repoUrl?: string;
  reports?: number;
  files?: string[];
  manifest?: {
    license?: string;
    dependencies?: Record<string, string>;
    [key: string]: unknown;
  };
  dist: {
    sha256: string | null;
    shasum?: string;
    integrity?: string;
    sizeBytes: number;
  };
  verification?: {
    status: 'pending' | 'running' | 'approved' | 'rejected' | 'failed';
    error?: string;
  };
  ingestion?: {
    tier: 'TIER_1';
    trustLevel: 'S1';
    passed: boolean;
    verifiedAt: string;
    errors?: string[];
  };
  certifications?: Certification[];
  stats?: PackageStats;
}

export interface PackageDetails {
  name: string;
  summary: string;
  authors: string[];
  tags: string[];
  isPrivate?: boolean;
  canEditMetadata: boolean;
  createdAt?: string;
  updatedAt?: string;
  latestVersion: string | null;
  versions: PackageVersion[];
  stats?: PackageStats;
}

export interface UpdatePackageMetadataInput {
  id: string;
  summary?: string;
  authors: string[];
  tags?: string[];
  isPrivate?: boolean;
}

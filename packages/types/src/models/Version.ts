import type { Certification } from './Certification';

export interface VersionInterface {
  version: string;
  repoUrl: string;
  hash: string;
  createdAt: Date;
  publishedBy: string;
  reports: number;
  token?: string;
  files: string[];
  certifications?: Certification[];
}

export interface VersionProps extends Omit<
  VersionInterface,
  'token' | 'createdAt' | 'reports'
> {
  publishedAt: Date;
}

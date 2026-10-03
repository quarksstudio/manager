import type { Certification } from '@quarks.studio/certification';
import { createContext, createElement, type ReactNode } from 'react';
import {
  type PackageReadme,
  type PackageVersion,
  type UpdatePackageMetadataInput,
} from '../domain/package-details';
export interface DistributionServices {
  downloadBundle(name: string, version: string): Promise<Response>;
  getCurrentUser(): Promise<{ id: string } | null>;
  get(name: string): Promise<unknown>;
  getReadme(name: string, version: string): Promise<PackageReadme>;
  update(
    body: { id: string; [key: string]: unknown },
    isNew?: boolean,
  ): Promise<unknown>;
}
export const ServicesContext = createContext<DistributionServices | null>(null);
export function DistributionProvider({
  services,
  children,
}: {
  services: DistributionServices;
  children: ReactNode;
}) {
  return createElement(ServicesContext.Provider, { value: services }, children);
}
export type UsePackageCertificationsReturn = {
  data: Certification[] | null;
  versions: PackageVersion[];
  latestVersion?: string;
  loading: boolean;
  error: unknown;
  refetch: () => void;
};
export interface UseUpdatePackageMetadataReturn {
  save: (input: UpdatePackageMetadataInput) => Promise<void>;
  status: 'idle' | 'saving' | 'success' | 'error';
  error: Error | null;
  reset: () => void;
}

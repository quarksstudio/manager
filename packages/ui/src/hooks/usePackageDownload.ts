import { useCallback } from 'react';
import { useRegistryClient } from '@quark/registry';

function downloadFileName(packageName: string, version: string): string {
  const safe = packageName
    .replace(/^@/, '')
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${safe}-${version}.tar.gz`;
}

export function usePackageDownload(packageName: string) {
  const client = useRegistryClient();

  const download = useCallback(
    async (version: string) => {
      const response = await client.Packages.downloadBundle(
        packageName,
        version,
      );
      try {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = downloadFileName(packageName, version);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } catch (reason) {
        throw reason instanceof Error ? reason : new Error(String(reason));
      }
    },
    [client, packageName],
  );

  return { download };
}

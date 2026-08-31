import { existsSync } from 'fs';
import { homedir } from 'os';

import { useState, useCallback } from 'react';

import { installSkill } from '@quark/installer';
import { removeSkill } from '@quark/local-store';
import { promptForPermissions } from '@quark/permissions';
import { useRegistryClient } from '@quark/registry';

const useInstaller = () => {
  const [status, setStatus] = useState<
    'idle' | 'fetching' | 'downloading' | 'installing' | 'success' | 'error'
  >('idle');
  const client = useRegistryClient();
  const [progress, setProgress] = useState('');

  const install = useCallback(
    async (packageName: string, where: string) => {
      setStatus('fetching');
      try {
        if (!existsSync(where)) {
          setStatus('error');
          return;
        }

        const pkgData = await client.Packages.get<{
          version: { version: string };
        }>(packageName);
        const versionData = pkgData.version;
        const version = versionData.version;

        setStatus('downloading');
        setProgress(`Downloading & Installing: ${packageName}@${version}`);

        const isGlobal = where === homedir();
        await installSkill(packageName, version, isGlobal, where, {
          approvePermissions: promptForPermissions,
        });

        setStatus('success');

        return version;
      } catch (err) {
        setStatus('error');
        setProgress(`Error: ${(err as Error).message}`);
        return undefined;
      }
    },
    [client],
  );

  const uninstall = useCallback(
    async (packageName: string, where: string) => {
      setStatus('fetching');
      try {
        if (!existsSync(where)) {
          setStatus('error');
          return;
        }

        const pkgData = await client.Packages.get<{
          version: { version: string };
        }>(packageName);
        const versionData = pkgData.version;
        setStatus('installing');
        setProgress(`Uninstall: ${packageName}`);

        removeSkill(
          packageName,
          versionData.version,
          where === homedir(),
          where,
        );

        setStatus('success');

        return versionData.version;
      } catch (err) {
        setStatus('error');
        setProgress(`Error: ${(err as Error).message}`);
        return undefined;
      }
    },
    [client],
  );

  return { install, status, progress, uninstall };
};

export default useInstaller;

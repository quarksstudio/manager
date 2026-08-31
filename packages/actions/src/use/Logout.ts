import { useState, useEffect, useMemo } from 'react';
import { useApp } from 'ink';
import { useRegistryClient } from '@quark/registry';
import useConfig from './Config';

const useLogout = () => {
  const [isLoad, setIsLoad] = useState(false);
  const { exit } = useApp();
  const { loading: configLoading, updateConfig } = useConfig();
  const client = useRegistryClient();

  const isLoading = useMemo(
    () => configLoading || isLoad,
    [configLoading, isLoad],
  );

  useEffect(() => {
    if (configLoading || !client) return;

    const fetchUser = async () => {
      setIsLoad(true);
      try {
        await client.Auth.me();
        await client.Auth.logout();
        await updateConfig({ token: '' });
      } catch {
        console.error('Error en Auth.Me');
      } finally {
        setIsLoad(false);
        exit();
      }
    };

    fetchUser();
  }, [client, configLoading, exit]);

  return isLoading;
};

export default useLogout;

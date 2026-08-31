import { useEffect } from 'react';
import { useApp } from 'ink';
import { useCurrentUser } from '@quark/registry';

interface CurrentUser {
  id: string;
  name: string;
}

const useMe = () => {
  const { data: user, loading: isLoading } = useCurrentUser<CurrentUser>();
  const { exit } = useApp();

  useEffect(() => {
    if (!isLoading) exit();
  }, [exit, isLoading]);

  return { user, isLoading };
};

export default useMe;

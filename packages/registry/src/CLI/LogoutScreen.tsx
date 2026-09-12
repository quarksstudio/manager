import React, { useEffect, useRef } from 'react';
import { useApp } from 'ink';

import { useAuthLogout } from '../index';
import { EXIT_CODES } from '@quark/ui/CLI';
import { Screen, StatusLine } from '@quark/ui/CLI';

export function LogoutScreen() {
  const { exit } = useApp();
  const { logout, status } = useAuthLogout();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void logout().then(
      () => exit(),
      () => {
        process.exitCode = EXIT_CODES.authentication;
        exit();
      },
    );
  }, [logout, exit]);

  return (
    <Screen title="Authentication">
      <StatusLine
        status={status}
        message={
          status === 'success'
            ? 'Token removed'
            : status === 'error'
              ? 'Logout failed'
              : 'Signing out...'
        }
      />
    </Screen>
  );
}

export default LogoutScreen;

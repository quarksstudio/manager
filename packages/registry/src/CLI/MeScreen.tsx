import React, { useEffect } from 'react';
import { useApp } from 'ink';

import { useCurrentUser } from '../index';
import { KeyValue, Panel, Result, Screen, StatusLine } from '@quark/ui/CLI';

interface CurrentUser {
  id: string;
  name: string;
}

export function MeScreen() {
  const { data: user, loading: isLoading } = useCurrentUser<CurrentUser>();
  const { exit } = useApp();

  useEffect(() => {
    if (!isLoading) exit();
  }, [exit, isLoading]);

  if (isLoading) {
    return (
      <Screen title="Authentication">
        <StatusLine status="running" message="Loading profile..." />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen title="Authentication">
        <Result success={false} message="Could not identify user" />
      </Screen>
    );
  }

  return (
    <Screen title="Authentication">
      <Panel color="success">
        <KeyValue
          items={[
            { key: 'ID', value: user.id },
            { key: 'User', value: user.name },
          ]}
        />
      </Panel>
    </Screen>
  );
}

export default MeScreen;

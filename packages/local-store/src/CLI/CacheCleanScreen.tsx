import React, { useEffect } from 'react';
import { useApp } from 'ink';
import { cleanSkillCache } from '../index';
import { EXIT_CODES } from '@quark/ui/CLI';
import { Result, Screen, StatusLine } from '@quark/ui/CLI';

export function CacheCleanScreen() {
  const { exit } = useApp();
  const [status, setStatus] = React.useState<'running' | 'success' | 'error'>(
    'running',
  );

  useEffect(() => {
    void cleanSkillCache().then(
      () => {
        setStatus('success');
        exit();
      },
      () => {
        setStatus('error');
        process.exitCode = EXIT_CODES.genericFailure;
        exit();
      },
    );
  }, [exit]);

  if (status === 'running') {
    return (
      <Screen title="Cache Clean">
        <StatusLine status="running" message="Clearing cache..." />
      </Screen>
    );
  }

  return (
    <Screen title="Cache Clean">
      <Result
        success={status === 'success'}
        message={
          status === 'success' ? 'Skill cache cleared' : 'Failed to clear cache'
        }
      />
    </Screen>
  );
}

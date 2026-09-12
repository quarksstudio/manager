import React, { useEffect } from 'react';
import { useApp } from 'ink';
import { listSkillCache, type CachedSkillArtifact } from '../index';
import { EXIT_CODES } from '@quark/ui/CLI';
import { EmptyState, Result, Screen, StatusLine, Table } from '@quark/ui/CLI';

interface CacheListScreenProps {
  json?: boolean;
}

export function CacheListScreen({ json }: CacheListScreenProps) {
  const { exit } = useApp();
  const [entries, setEntries] = React.useState<CachedSkillArtifact[]>([]);
  const [status, setStatus] = React.useState<'running' | 'success' | 'error'>(
    'running',
  );

  useEffect(() => {
    void listSkillCache().then(
      (items) => {
        setEntries(items);
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
      <Screen title="Cache">
        <StatusLine status="running" message="Loading cache..." />
      </Screen>
    );
  }

  if (json) {
    return (
      <Screen title="Cache">
        <StatusLine status="success" message={JSON.stringify(entries)} />
      </Screen>
    );
  }

  if (entries.length === 0) {
    return (
      <Screen title="Cache">
        <EmptyState message="Skill cache is empty" />
      </Screen>
    );
  }

  return (
    <Screen title="Cache">
      <Table
        columns={[
          { key: 'name', header: 'Name', width: 20 },
          { key: 'version', header: 'Version', width: 10 },
          { key: 'hash', header: 'Hash', width: 12 },
          { key: 'sizeBytes', header: 'Size', width: 10 },
        ]}
        rows={entries.map((e) => ({
          name: e.name,
          version: e.version,
          hash: e.hash.slice(0, 12),
          sizeBytes: e.sizeBytes,
        }))}
      />
      <Result success={true} message={`${entries.length} cached artifact(s)`} />
    </Screen>
  );
}

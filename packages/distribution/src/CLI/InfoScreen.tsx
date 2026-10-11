import React, { useCallback, useEffect } from 'react';
import { useApp } from 'ink';
import { useQuery } from '@quarks.studio/storage/query';
import { Result, Screen, StatusLine } from '@quarks.studio/terminal-ui';
import { useDistributionServices } from '../hooks/useDistributionServices';
import { loadPackageInfo } from '../application/package-info';
import { InfoContent } from './InfoContent';

interface InfoScreenProps {
  name: string;
}

export function InfoScreen({ name }: InfoScreenProps) {
  const services = useDistributionServices();
  const load = useCallback(
    () => loadPackageInfo(name, services),
    [name, services],
  );
  const { data: info, error, loading } = useQuery(load);
  const { exit } = useApp();

  useEffect(() => {
    if (!loading) exit();
  }, [exit, loading]);

  if (loading) {
    return (
      <Screen title="Info">
        <StatusLine status="running" message={`Fetching ${name}...`} />
      </Screen>
    );
  }
  if (error || !info) {
    return (
      <Screen title="Info">
        <Result
          success={false}
          message={String(error ?? 'Package not found')}
        />
      </Screen>
    );
  }

  return <InfoContent info={info} />;
}

export default InfoScreen;

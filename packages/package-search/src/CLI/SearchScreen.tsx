import React, { useCallback, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { useServices } from '../hooks/useServices';
import { useQuery } from '@quarks.studio/storage/query';
import type {
  SearchFilters,
  SearchOptions,
  RemoteSearchPage,
} from '../domain/package-search-item';

import {
  EmptyState,
  Result,
  Screen,
  StatusLine,
} from '@quarks.studio/terminal-ui';

export interface SearchScreenProps {
  query?: string;
  filters?: SearchFilters;
  options?: SearchOptions;
  cursor?: string;
  json?: boolean;
}

export function SearchScreen({
  query,
  filters,
  options = {},
  cursor,
  json,
}: SearchScreenProps) {
  const { fetchRemotePackages } = useServices();
  const requestKey = JSON.stringify({
    filters: filters ?? { query },
    options,
    cursor,
  });
  const load = useCallback(() => {
    const request = JSON.parse(requestKey) as {
      filters: SearchFilters;
      options: SearchOptions;
      cursor?: string;
    };
    return fetchRemotePackages(
      request.filters,
      request.options,
      request.cursor,
    );
  }, [requestKey, fetchRemotePackages]);
  const {
    data: page,
    loading: isSearchingRemote,
    error,
  } = useQuery<RemoteSearchPage>(load);
  const items = page?.items ?? [];
  const searchError =
    error === undefined
      ? null
      : error instanceof Error
        ? error.message
        : String(error);
  const label = filters?.query ?? query;
  const { exit } = useApp();

  useEffect(() => {
    if (!isSearchingRemote) {
      if (error !== undefined) process.exitCode = 1;
      exit();
    }
  }, [exit, isSearchingRemote, error]);

  if (isSearchingRemote && items.length === 0) {
    return (
      <Screen title="Search">
        <StatusLine
          status="running"
          message={
            label ? `Searching for "${label}"...` : 'Searching registry...'
          }
        />
      </Screen>
    );
  }

  if (searchError && !isSearchingRemote) {
    return (
      <Screen title="Search">
        <StatusLine status="error" message={searchError} />
      </Screen>
    );
  }

  if (json) {
    return (
      <Screen title="Search">
        <StatusLine status="success" message={JSON.stringify(items)} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Search"
      subtitle={label ? `Results for "${label}"` : 'Registry results'}
    >
      {items.length === 0 ? (
        <EmptyState message="No matching packages found" />
      ) : (
        <Box flexDirection="column">
          {items.map((item) => (
            <Box key={item.name}>
              <Text color="cyan">{item.name.padEnd(20)}</Text>
              <Text color="yellow">{item.version}</Text>
            </Box>
          ))}
        </Box>
      )}
      <Result
        success={items.length > 0}
        message={`${items.length} package(s) shown; ${page?.totalCount ?? 0} total matches`}
      />
      {page?.nextCursor && (
        <Text wrap="wrap">Next cursor: {page.nextCursor}</Text>
      )}
    </Screen>
  );
}

export default SearchScreen;

import React, { useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { useSearchPackages } from '../index';

import { EmptyState, Result, Screen, StatusLine } from '@quark/ui/CLI';

interface SearchScreenProps {
  query: string;
  json?: boolean;
}

export function SearchScreen({ query, json }: SearchScreenProps) {
  const { combinedResults: items, isSearchingRemote } = useSearchPackages({
    query,
  });
  const { exit } = useApp();

  useEffect(() => {
    if (!isSearchingRemote) exit();
  }, [exit, isSearchingRemote]);

  if (isSearchingRemote && items.length === 0) {
    return (
      <Screen title="Search">
        <StatusLine status="running" message={`Searching for "${query}"...`} />
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
    <Screen title="Search" subtitle={`Results for "${query}"`}>
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
        message={`${items.length} package(s) found`}
      />
    </Screen>
  );
}

export default SearchScreen;

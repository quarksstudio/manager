import React from 'react';
import { Box, Text } from 'ink';

import { theme } from '../../theme';

interface KeyValueProps {
  items: Array<{ key: string; value: string | number | boolean | undefined }>;
}

export function KeyValue({ items }: KeyValueProps) {
  const maxKeyLen = items.reduce(
    (max, item) => Math.max(max, item.key.length),
    0,
  );

  return (
    <Box flexDirection="column">
      {items.map((item) => (
        <Box key={item.key}>
          <Text color={theme.colors.muted}>
            {item.key.padEnd(maxKeyLen + 2)}
          </Text>
          <Text>{String(item.value ?? '—')}</Text>
        </Box>
      ))}
    </Box>
  );
}

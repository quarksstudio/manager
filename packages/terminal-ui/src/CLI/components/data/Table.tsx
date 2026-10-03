import React from 'react';
import { Box, Text } from 'ink';

import { theme } from '../../theme';

interface Column<T> {
  key: string;
  header: string;
  width?: number;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = 'No data',
}: TableProps<T>) {
  if (rows.length === 0) {
    return (
      <Text color={theme.colors.muted} italic>
        {emptyMessage}
      </Text>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        {columns.map((col) => (
          <Text key={col.key} bold color={theme.colors.muted}>
            {col.header.padEnd((col.width ?? col.header.length) + 2)}
          </Text>
        ))}
      </Box>
      {rows.map((row, i) => (
        <Box key={i}>
          {columns.map((col) => {
            const raw = row[col.key];
            const cell = col.render ? col.render(row) : String(raw ?? '—');
            const width = col.width ?? String(raw ?? '').length;
            return (
              <Text key={col.key}>
                {typeof cell === 'string' ? cell.padEnd(width + 2) : cell}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

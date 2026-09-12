import React from 'react';
import { Text } from 'ink';

import { theme } from '../../theme';
import type { TaskStatus } from '../../types';

interface StatusLineProps {
  status: TaskStatus;
  message: string;
  detail?: string;
}

const statusColor: Record<
  TaskStatus,
  'gray' | 'cyan' | 'green' | 'red' | 'yellow'
> = {
  idle: 'gray',
  running: 'cyan',
  success: 'green',
  error: 'red',
  cancelled: 'yellow',
};

export function StatusLine({ status, message, detail }: StatusLineProps) {
  return (
    <Text color={statusColor[status]}>
      {theme.symbols[status]} {message}
      {detail ? ` — ${detail}` : ''}
    </Text>
  );
}

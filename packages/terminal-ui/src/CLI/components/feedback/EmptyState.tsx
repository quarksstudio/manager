import React from 'react';
import { Text } from 'ink';

import { theme } from '../../theme';

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = 'Nothing to show' }: EmptyStateProps) {
  return (
    <Text color={theme.colors.muted} italic>
      {message}
    </Text>
  );
}

import React from 'react';
import { Box, Text } from 'ink';

import { theme } from '../../theme';
import type { WorkflowStep } from '../../types';

interface StepListProps {
  steps: WorkflowStep[];
}

const stepSymbol: Record<WorkflowStep['status'], string> = {
  pending: theme.symbols.idle,
  active: theme.symbols.running,
  success: theme.symbols.success,
  error: theme.symbols.error,
  skipped: theme.symbols.cancelled,
};

const stepColor: Record<
  WorkflowStep['status'],
  'gray' | 'cyan' | 'green' | 'red' | 'yellow'
> = {
  pending: 'gray',
  active: 'cyan',
  success: 'green',
  error: 'red',
  skipped: 'yellow',
};

export function StepList({ steps }: StepListProps) {
  return (
    <Box flexDirection="column">
      {steps.map((step) => (
        <Box key={step.id}>
          <Text color={stepColor[step.status]}>{stepSymbol[step.status]} </Text>
          <Text color={step.status === 'active' ? 'cyan' : undefined}>
            {step.label}
          </Text>
          {step.detail ? (
            <Text color={theme.colors.muted}> — {step.detail}</Text>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

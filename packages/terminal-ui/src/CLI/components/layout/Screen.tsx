import React, { type PropsWithChildren } from 'react';
import { Box, Text } from 'ink';

interface ScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        {title}
      </Text>
      {subtitle ? (
        <Text color="gray" dimColor>
          {subtitle}
        </Text>
      ) : null}
      <Box flexDirection="column" marginTop={1}>
        {children}
      </Box>
    </Box>
  );
}

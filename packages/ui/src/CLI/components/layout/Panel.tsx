import React, { type PropsWithChildren } from 'react';
import { Box } from 'ink';

import { theme } from '../../theme';
import type { ThemeColor } from '../../theme';

interface PanelProps extends PropsWithChildren {
  color?: ThemeColor;
  padding?: number;
  width?: number | string;
}

export function Panel({
  color = 'muted',
  padding = 1,
  width,
  children,
}: PanelProps) {
  return (
    <Box
      borderStyle="round"
      borderColor={theme.colors[color]}
      padding={padding}
      width={width}
      flexDirection="column"
    >
      {children}
    </Box>
  );
}

import React from 'react';
import { Box, Text, useInput } from 'ink';

import { theme } from '../../theme';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  options: SelectOption[];
  selectedIndex: number;
  onSelect: (value: string) => void;
  onMove: (direction: 'up' | 'down') => void;
}

export function Select({
  options,
  selectedIndex,
  onSelect,
  onMove,
}: SelectProps) {
  useInput((input, key) => {
    if (key.upArrow) {
      onMove('up');
    } else if (key.downArrow) {
      onMove('down');
    } else if (key.return) {
      onSelect(options[selectedIndex].value);
    }
  });

  return (
    <Box flexDirection="column">
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Text
            key={option.value}
            color={isSelected ? theme.colors.warning : undefined}
          >
            {isSelected ? '›' : ' '} {option.label}
          </Text>
        );
      })}
    </Box>
  );
}

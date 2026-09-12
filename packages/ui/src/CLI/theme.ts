export const theme = {
  colors: {
    accent: 'cyan',
    info: 'blue',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    muted: 'gray',
  },
  symbols: {
    idle: '◌',
    running: '⠋',
    success: '✔',
    warning: '!',
    error: '✖',
    cancelled: '-',
  },
} as const;

export type ThemeColor = keyof typeof theme.colors;

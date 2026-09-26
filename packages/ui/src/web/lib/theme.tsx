import type { ReactNode } from 'react';
import { ConfigProvider, theme } from 'antd';

export interface QuarkThemeProps {
  children: ReactNode;
}

export function QuarkTheme({ children }: QuarkThemeProps) {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      {children}
    </ConfigProvider>
  );
}

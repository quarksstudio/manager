import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';
import { useTabsContext } from './tabs-context';

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, ...props }: TabsContentProps) {
  const { value: active } = useTabsContext();
  if (value !== active) return null;
  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      data-state="active"
      className={cn('mt-4', className)}
      {...props}
    />
  );
}

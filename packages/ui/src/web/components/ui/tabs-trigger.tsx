import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';
import { useTabsContext } from './tabs-context';

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const { value: active, setValue } = useTabsContext();
  const selected = active === value;
  return (
    <button
      data-slot="tabs-trigger"
      type="button"
      role="tab"
      aria-selected={selected}
      data-state={selected ? 'active' : 'inactive'}
      onClick={() => setValue(value)}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        selected
          ? 'bg-background text-foreground shadow'
          : 'hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

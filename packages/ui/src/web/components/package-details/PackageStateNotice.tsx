import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '../ui/button';

export interface PackageStateNoticeProps {
  title: string;
  description?: string;
  loading?: boolean;
  onRetry?: () => void;
  children?: ReactNode;
}

export function PackageStateNotice({
  title,
  description,
  loading,
  onRetry,
  children,
}: PackageStateNoticeProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={loading}
        >
          <RefreshCw
            aria-hidden="true"
            className={loading ? 'animate-spin' : undefined}
          />
          Retry
        </Button>
      ) : null}
      {children}
    </div>
  );
}

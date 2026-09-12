import { RefreshCw } from 'lucide-react';

import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { renderMarkdown } from '../../lib/markdown';

export interface ReadmeTabProps {
  loading: boolean;
  error: unknown;
  content: string;
  version: string;
  onRetry: () => void;
}

export function ReadmeTab({
  loading,
  error,
  content,
  version,
  onRetry,
}: ReadmeTabProps) {
  if (loading) {
    return (
      <div data-testid="readme-loading" className="space-y-3">
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The README for v{version || 'latest'} could not be loaded.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  if (!content.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        No README available for v{version || 'latest'}.
      </p>
    );
  }

  return (
    <div
      data-testid="readme-content"
      className="quark-prose"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

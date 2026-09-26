import { ReloadOutlined } from '@ant-design/icons';
import { Skeleton, Typography } from 'antd';

import { renderMarkdown } from '../../lib/markdown';
import { QuarkTheme } from '../../lib/theme';

export interface ReadmeTabProps {
  loading: boolean;
  error?: unknown;
  content: string;
  version: string;
  onRetry?: () => void;
  retryUrl?: string;
}

export function ReadmeTab({
  loading,
  error,
  content,
  version,
  onRetry,
  retryUrl,
}: ReadmeTabProps) {
  if (loading) {
    return (
      <QuarkTheme>
        <div data-testid="readme-loading">
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      </QuarkTheme>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <Typography.Text type="secondary">
          The README for v{version || 'latest'} could not be loaded.
        </Typography.Text>
        <br />
        <a href={retryUrl} onClick={onRetry}>
          <ReloadOutlined aria-hidden="true" /> Retry
        </a>
      </div>
    );
  }

  if (!content.trim()) {
    return (
      <Typography.Text type="secondary">
        No README available for v{version || 'latest'}.
      </Typography.Text>
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

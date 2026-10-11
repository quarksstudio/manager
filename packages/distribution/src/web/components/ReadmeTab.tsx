import { Typography } from 'antd';
import { renderMarkdown } from '../lib/markdown';

export interface ReadmeTabProps {
  content: string;
  version: string;
}

export function ReadmeTab({ content, version }: ReadmeTabProps) {
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

import { Card, Divider, Flex, Tag, Typography } from 'antd';
import { formatCount, formatSinceDate } from '@quarks.studio/web-ui';
import { QuarkTheme } from '@quarks.studio/web-ui';
import { FieldLabel } from './FieldLabel';
import { InstallCommand } from './InstallCommand';

export interface PackageSidebarProps {
  packageName: string;
  version?: string | null;
  downloads?: number;
  downloadsSince?: string;
  authors?: string[];
  tags?: string[];
  installCommand: string;
}

export function PackageSidebar({
  version,
  downloads,
  downloadsSince,
  authors = [],
  tags = [],
  installCommand,
}: PackageSidebarProps) {
  return (
    <QuarkTheme>
      <aside
        data-testid="package-sidebar"
        className="grid gap-4 self-start lg:sticky lg:top-6"
      >
        <Card>
          <Flex vertical gap={20}>
            <div className="grid grid-cols-2 gap-4">
              <Flex vertical gap={4}>
                <FieldLabel>Version</FieldLabel>
                <Typography.Text
                  className="font-mono !text-lg !font-semibold"
                  data-testid="version"
                >
                  {version ?? '—'}
                </Typography.Text>
              </Flex>
              <Flex vertical gap={4}>
                <FieldLabel>Downloads</FieldLabel>
                <Typography.Text
                  className="!text-lg !font-semibold"
                  data-testid="downloads-count"
                >
                  {formatCount(downloads ?? 0)}
                </Typography.Text>
                {downloadsSince ? (
                  <Typography.Text type="secondary" className="!text-xs">
                    since {formatSinceDate(downloadsSince)}
                  </Typography.Text>
                ) : null}
              </Flex>
            </div>
            <Divider className="!my-0" />
            <Flex vertical gap={8}>
              <FieldLabel>Authors</FieldLabel>
              {authors.length === 0 ? (
                <Typography.Text type="secondary" className="text-sm">
                  No authors listed
                </Typography.Text>
              ) : (
                <ul className="space-y-1">
                  {authors.map((author) => (
                    <li key={author} className="text-sm">
                      {author}
                    </li>
                  ))}
                </ul>
              )}
            </Flex>
            <Flex vertical gap={8}>
              <FieldLabel>Tags</FieldLabel>
              {tags.length === 0 ? (
                <Typography.Text type="secondary" className="text-sm">
                  No tags
                </Typography.Text>
              ) : (
                <Flex wrap gap={8}>
                  {tags.map((tag) => (
                    <Tag bordered key={tag}>
                      {tag}
                    </Tag>
                  ))}
                </Flex>
              )}
            </Flex>
            <Divider className="!my-0" />
            <Flex vertical gap={8}>
              <FieldLabel>Install</FieldLabel>
              <InstallCommand command={installCommand} />
            </Flex>
          </Flex>
        </Card>
      </aside>
    </QuarkTheme>
  );
}

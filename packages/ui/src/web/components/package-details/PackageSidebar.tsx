import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Button, Card, Divider, Flex, Tag, Typography } from 'antd';

import { formatCount, formatSinceDate } from '../../lib/format';
import { QuarkTheme } from '../../lib/theme';

async function copyText(value: string): Promise<boolean> {
  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy copy path.
  }
  const area = document.createElement('textarea');
  area.value = value;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  return copied;
}

export interface PackageSidebarProps {
  packageName: string;
  latestVersion?: string | null;
  downloads?: number;
  downloadsSince?: string;
  authors?: string[];
  tags?: string[];
  installCommand: string;
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Typography.Text
      type="secondary"
      className="!text-xs !uppercase tracking-wide"
    >
      {children}
    </Typography.Text>
  );
}

function InstallCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = async () => {
    const ok = await copyText(command);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };
  return (
    <Flex align="center" gap={8} className="rounded border px-3 py-2">
      <Typography.Text
        className="min-w-0 flex-1 truncate font-mono !text-sm"
        code
      >
        {command}
      </Typography.Text>
      <Button
        type="text"
        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
        aria-label={copied ? 'Copied' : 'Copy install command'}
        data-testid="copy-install"
        onClick={() => void handleClick()}
      />
    </Flex>
  );
}

export function PackageSidebar({
  latestVersion,
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
                <FieldLabel>Last version</FieldLabel>
                <Typography.Text
                  className="font-mono !text-lg !font-semibold"
                  data-testid="last-version"
                >
                  {latestVersion ?? '—'}
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

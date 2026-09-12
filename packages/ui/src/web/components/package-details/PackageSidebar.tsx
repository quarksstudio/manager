import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { formatCount, formatSinceDate } from '../../lib/format';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { CardContent } from '../ui/card-content';
import { Separator } from '../ui/separator';

export interface PackageSidebarProps {
  packageName: string;
  latestVersion?: string | null;
  downloads?: number;
  downloadsSince?: string;
  authors?: string[];
  tags?: string[];
  installCommand: string;
}

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

export function PackageSidebar({
  latestVersion,
  downloads,
  downloadsSince,
  authors = [],
  tags = [],
  installCommand,
}: PackageSidebarProps) {
  return (
    <aside
      data-testid="package-sidebar"
      className="grid gap-4 self-start lg:sticky lg:top-6"
    >
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Last version
              </span>
              <p
                className="font-mono text-lg font-semibold"
                data-testid="last-version"
              >
                {latestVersion ?? '—'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Downloads
              </span>
              <p
                className="text-lg font-semibold"
                data-testid="downloads-count"
              >
                {formatCount(downloads ?? 0)}
              </p>
              {downloadsSince ? (
                <p className="text-xs text-muted-foreground">
                  since {formatSinceDate(downloadsSince)}
                </p>
              ) : null}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Authors
            </span>
            {authors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No authors listed</p>
            ) : (
              <ul className="space-y-1">
                {authors.map((author) => (
                  <li key={author} className="text-sm text-foreground">
                    {author}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Tags
            </span>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Install
            </span>
            <InstallCommand command={installCommand} />
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function InstallCommand({ command }: { command: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
        {command}
      </code>
      <CopyButton text={command} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = async () => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={copied ? 'Copied' : 'Copy install command'}
      data-testid="copy-install"
      onClick={() => void handleClick()}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </Button>
  );
}

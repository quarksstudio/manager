import { Download } from 'lucide-react';
import {
  sortVersions,
  type PackageVersion,
} from '@quarks.studio/registry/client';

import { certificationBadge } from '../../lib/certification';
import { formatDate } from '../../lib/format';
import { Badge } from '../ui/badge';

export interface VersionsTabProps {
  packageName: string;
  versions: PackageVersion[];
  selectedVersion: string;
  onSelectVersion?: (version: string) => void;
  versionUrls?: Record<string, string>;
  downloadUrls?: Record<string, string>;
  onDownload?: (version: string) => void;
}

export function VersionsTab({
  packageName,
  versions,
  selectedVersion,
  onSelectVersion,
  onDownload,
  versionUrls,
  downloadUrls,
}: VersionsTabProps) {
  const ordered = sortVersions(versions);

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No published versions for {packageName}.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border" data-testid="versions-list">
      {ordered.map((item) => {
        const badge = certificationBadge(item.certifications);
        const selected = item.version === selectedVersion;
        return (
          <li
            key={item.version}
            className={selected ? 'bg-muted/50' : undefined}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={versionUrls?.[item.version]}
                  data-testid={`select-${item.version}`}
                  aria-pressed={selected}
                  onClick={() => onSelectVersion?.(item.version)}
                  className="font-mono text-sm font-medium text-foreground hover:underline"
                >
                  {item.version}
                </a>
                <Badge variant={badge ? 'success' : 'outline'}>
                  {badge?.label ?? 'Sin certificar'}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {formatDate(item.date)}
                </span>
                <a
                  href={downloadUrls?.[item.version]}
                  aria-label={`Download version ${item.version}`}
                  onClick={() => onDownload?.(item.version)}
                >
                  <Download aria-hidden="true" />
                </a>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

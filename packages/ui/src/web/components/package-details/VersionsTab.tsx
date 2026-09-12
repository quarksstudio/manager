import { Download } from 'lucide-react';
import { sortVersions, type PackageVersion } from '@quark/registry';

import { certificationBadge } from '../../../hooks/usePackageDetailsView';
import { formatDate } from '../../lib/format';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export interface VersionsTabProps {
  packageName: string;
  versions: PackageVersion[];
  selectedVersion: string;
  onSelectVersion: (version: string) => void;
  onDownload: (version: string) => void;
}

export function VersionsTab({
  packageName,
  versions,
  selectedVersion,
  onSelectVersion,
  onDownload,
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
                <button
                  type="button"
                  data-testid={`select-${item.version}`}
                  aria-pressed={selected}
                  onClick={() => onSelectVersion(item.version)}
                  className="font-mono text-sm font-medium text-foreground hover:underline"
                >
                  {item.version}
                </button>
                <Badge variant={badge ? 'success' : 'outline'}>
                  {badge?.label ?? 'Sin certificar'}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {formatDate(item.date)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Download version ${item.version}`}
                  onClick={() => onDownload(item.version)}
                >
                  <Download aria-hidden="true" />
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

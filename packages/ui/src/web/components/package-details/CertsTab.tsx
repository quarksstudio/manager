import { sortVersions, type PackageVersion } from '@quark/registry';

import { formatDate } from '../../lib/format';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';

export interface CertificationRow {
  tier: string;
  status: string;
  approvedAt?: string;
  reportUrl?: string;
}

export interface CertsTabProps {
  versions: PackageVersion[];
  selectedVersion: string;
  onSelectVersion: (version: string) => void;
  certifications: CertificationRow[];
}

const STATUS_LABEL: Record<string, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
};

function statusVariant(
  status: string,
): 'success' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'destructive';
  if (status === 'pending') return 'secondary';
  return 'outline';
}

export function CertsTab({
  versions,
  selectedVersion,
  onSelectVersion,
  certifications,
}: CertsTabProps) {
  const ordered = sortVersions(versions);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="certs-version">Version</Label>
        <select
          id="certs-version"
          data-testid="certs-version-select"
          value={selectedVersion}
          onChange={(event) => onSelectVersion(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {ordered.map((item) => (
            <option key={item.version} value={item.version}>
              {item.version}
            </option>
          ))}
        </select>
      </div>

      {certifications.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="certs-empty">
          No certifications for v{selectedVersion || 'latest'}.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border" data-testid="certs-list">
          {certifications.map((item) => (
            <li
              key={item.tier}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium">
                  {item.tier}
                </span>
                <Badge variant={statusVariant(item.status)}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {item.approvedAt ? (
                  <span>{formatDate(item.approvedAt)}</span>
                ) : null}
                {item.reportUrl ? (
                  <a
                    href={item.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    Report
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

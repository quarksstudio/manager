import { Badge } from '../ui/badge';
import type { CertificationBadge } from '../../../hooks/usePackageDetailsView';

export interface PackageHeaderProps {
  name: string;
  badge: CertificationBadge | null;
  description?: string;
}

export function PackageHeader({
  name,
  badge,
  description,
}: PackageHeaderProps) {
  const certified = badge !== null;
  return (
    <header data-testid="package-header" className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {name}
        </h1>
        <Badge variant={certified ? 'success' : 'secondary'}>
          {badge?.label ?? 'Sin certificar'}
        </Badge>
      </div>
      {description ? (
        <p className="max-w-3xl text-base text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}

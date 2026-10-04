import { Card } from 'antd';
import type { PackageSearchItem } from '../../domain/package-search-item';

export function UserPackageGrid({
  items,
  packageUrl,
}: {
  items: PackageSearchItem[];
  packageUrl: (name: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card
          key={item.name}
          size="small"
          className="h-full !border-colorSplit"
        >
          <a
            href={packageUrl(item.name)}
            className="block break-all font-mono text-sm font-semibold"
          >
            {item.name}
          </a>
          <p className="mt-3 line-clamp-3 break-words text-sm text-slate-400">
            {item.description}
          </p>
        </Card>
      ))}
    </div>
  );
}

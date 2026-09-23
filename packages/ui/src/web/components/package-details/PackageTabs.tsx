import { useEffect, useState } from 'react';
import {
  certificationsForVersion,
  type PackageDetails,
} from '@quarks.studio/registry/client';
import { ReadmeTab } from './ReadmeTab';
import { VersionsTab } from './VersionsTab';
import { CertsTab } from './CertsTab';
import { ConfigTab } from './ConfigTab';
export interface ReadmeState {
  loading: boolean;
  error?: unknown;
  content: string;
  version: string;
  retryUrl?: string;
  onRetry?: () => void;
}
export interface PackageTabsProps {
  packageName: string;
  detail: PackageDetails;
  selectedVersion: string;
  readme: ReadmeState;
  urls: {
    versions: Record<string, string>;
    downloads: Record<string, string>;
    metadata?: string;
  };
  formError?: string;
  draft?: { description: string; tags: string; authors: string };
}
/** All sections render on the server; hydration adds purely visual tabs. */
export function PackageTabs({
  packageName,
  detail,
  selectedVersion,
  readme,
  urls,
  formError,
  draft,
}: PackageTabsProps) {
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState(formError ? 'config' : 'readme');
  useEffect(() => setHydrated(true), []);
  const tabs = [
    ['readme', 'ReadMe'],
    ['versions', 'Versions'],
    ['certs', 'Certs'],
    ...(detail.canEditMetadata ? [['config', 'Config']] : []),
  ];
  const sectionId = (tab: string) =>
    `${encodeURIComponent(packageName)}-${tab}`;
  return (
    <div className="space-y-6" data-testid="package-tabs">
      <nav aria-label="Package sections" className="flex gap-4 border-b pb-2">
        {tabs.map(([tab, label]) => (
          <a
            key={tab}
            href={`#${sectionId(tab)}`}
            aria-current={active === tab ? 'page' : undefined}
            className={
              active === tab
                ? 'font-semibold text-primary'
                : 'text-muted-foreground'
            }
            onClick={(event) => {
              if (hydrated) {
                event.preventDefault();
                setActive(tab);
              }
            }}
          >
            {label}
          </a>
        ))}
      </nav>
      <section
        id={sectionId('readme')}
        hidden={hydrated && active !== 'readme'}
      >
        <h2 className="sr-only">ReadMe</h2>
        <ReadmeTab {...readme} />
      </section>
      <section
        id={sectionId('versions')}
        hidden={hydrated && active !== 'versions'}
      >
        <h2 className="sr-only">Versions</h2>
        <VersionsTab
          packageName={packageName}
          versions={detail.versions ?? []}
          selectedVersion={selectedVersion}
          versionUrls={urls.versions}
          downloadUrls={urls.downloads}
        />
      </section>
      <section id={sectionId('certs')} hidden={hydrated && active !== 'certs'}>
        <h2 className="sr-only">Certs</h2>
        <CertsTab
          versions={detail.versions ?? []}
          selectedVersion={selectedVersion}
          versionUrls={urls.versions}
          certifications={certificationsForVersion(detail, selectedVersion)}
        />
      </section>
      {detail.canEditMetadata && (
        <section
          id={sectionId('config')}
          hidden={hydrated && active !== 'config'}
        >
          <h2 className="sr-only">Config</h2>
          <ConfigTab
            packageName={packageName}
            detail={detail}
            action={urls.metadata}
            error={formError}
            draft={draft}
          />
        </section>
      )}
    </div>
  );
}

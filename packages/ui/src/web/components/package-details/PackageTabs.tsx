import {
  certificationsForVersion,
  type PackageDetails,
} from '@quarks.studio/registry/client';
import { Tabs, type TabsProps } from 'antd';

import { QuarkTheme } from '../../lib/theme';
import { CertsTab } from './CertsTab';
import { ConfigTab } from './ConfigTab';
import { ReadmeTab } from './ReadmeTab';
import { VersionsTab } from './VersionsTab';
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
  const sectionId = (tab: string) =>
    `${encodeURIComponent(packageName)}-${tab}`;
  const items: TabsProps['items'] = [
    {
      key: 'readme',
      label: 'ReadMe',
      forceRender: true,
      children: (
        <section id={sectionId('readme')}>
          <h2 className="sr-only">ReadMe</h2>
          <ReadmeTab {...readme} />
        </section>
      ),
    },
    {
      key: 'versions',
      label: 'Versions',
      forceRender: true,
      children: (
        <section id={sectionId('versions')}>
          <h2 className="sr-only">Versions</h2>
          <VersionsTab
            packageName={packageName}
            versions={detail.versions ?? []}
            selectedVersion={selectedVersion}
            versionUrls={urls.versions}
            downloadUrls={urls.downloads}
          />
        </section>
      ),
    },
    {
      key: 'certs',
      label: 'Certs',
      forceRender: true,
      children: (
        <section id={sectionId('certs')}>
          <h2 className="sr-only">Certs</h2>
          <CertsTab
            versions={detail.versions ?? []}
            selectedVersion={selectedVersion}
            versionUrls={urls.versions}
            certifications={certificationsForVersion(detail, selectedVersion)}
          />
        </section>
      ),
    },
    ...(detail.canEditMetadata
      ? [
          {
            key: 'config',
            label: 'Config',
            forceRender: true,
            children: (
              <section id={sectionId('config')}>
                <h2 className="sr-only">Config</h2>
                <ConfigTab
                  packageName={packageName}
                  detail={detail}
                  action={urls.metadata}
                  error={formError}
                  draft={draft}
                />
              </section>
            ),
          },
        ]
      : []),
  ];
  return (
    <QuarkTheme>
      <div className="space-y-6" data-testid="package-tabs">
        <Tabs
          defaultActiveKey={formError ? 'config' : 'readme'}
          items={items}
          tabBarGutter={32}
        />
      </div>
    </QuarkTheme>
  );
}

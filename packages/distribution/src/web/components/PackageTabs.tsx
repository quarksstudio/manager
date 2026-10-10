import { type PackageDetails } from '../../index';
import { Tabs, type TabsProps } from 'antd';

import { QuarkTheme } from '@quarks.studio/web-ui';
import { ConfigTab } from './ConfigTab';
import { ReadmeTab } from './ReadmeTab';
import { SubscriptionsTab } from './SubscriptionsTab';
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
  };
}
/** All sections render on the server; hydration adds purely visual tabs. */
export function PackageTabs({
  packageName,
  detail,
  selectedVersion,
  readme,
  urls,
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
    ...(detail.canEditMetadata
      ? [
          {
            key: 'subscriptions',
            label: 'Suscripciones',
            forceRender: true,
            children: (
              <section id={sectionId('subscriptions')}>
                <h2 className="sr-only">Suscripciones</h2>
                <SubscriptionsTab
                  detail={detail}
                  selectedVersion={selectedVersion}
                />
              </section>
            ),
          },
          {
            key: 'config',
            label: 'Configuración',
            forceRender: true,
            children: (
              <section id={sectionId('config')}>
                <h2 className="sr-only">Configuración</h2>
                <ConfigTab detail={detail} />
              </section>
            ),
          },
        ]
      : []),
  ];
  return (
    <QuarkTheme>
      <div className="space-y-6" data-testid="package-tabs">
        <Tabs defaultActiveKey="readme" items={items} tabBarGutter={32} />
      </div>
    </QuarkTheme>
  );
}

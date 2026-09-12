import { BookOpen, Layers, Settings, ShieldCheck } from 'lucide-react';
import { certificationsForVersion, type PackageDetails } from '@quark/registry';

import { Tabs } from '../ui/tabs';
import { TabsList } from '../ui/tabs-list';
import { TabsTrigger } from '../ui/tabs-trigger';
import { TabsContent } from '../ui/tabs-content';
import { ReadmeTab } from './ReadmeTab';
import { VersionsTab } from './VersionsTab';
import { CertsTab } from './CertsTab';
import { ConfigTab } from './ConfigTab';

export interface ReadmeState {
  loading: boolean;
  error: unknown;
  content: string;
  version: string;
  onRetry: () => void;
}

export interface PackageTabsProps {
  packageName: string;
  detail: PackageDetails;
  selectedVersion: string;
  onSelectVersion: (version: string) => void;
  onDownload: (version: string) => void;
  readme: ReadmeState;
  onDetailRefetch: () => void;
}

export function PackageTabs({
  packageName,
  detail,
  selectedVersion,
  onSelectVersion,
  onDownload,
  readme,
  onDetailRefetch,
}: PackageTabsProps) {
  const versions = detail.versions ?? [];
  const canEdit = detail.canEditMetadata;
  return (
    <Tabs defaultValue="readme" className="min-w-0" data-testid="package-tabs">
      <TabsList>
        <TabsTrigger value="readme">
          <BookOpen aria-hidden="true" />
          <span>ReadMe</span>
        </TabsTrigger>
        <TabsTrigger value="versions">
          <Layers aria-hidden="true" />
          <span>Versions</span>
        </TabsTrigger>
        <TabsTrigger value="certs">
          <ShieldCheck aria-hidden="true" />
          <span>Certs</span>
        </TabsTrigger>
        {canEdit ? (
          <TabsTrigger value="config">
            <Settings aria-hidden="true" />
            <span>Config</span>
          </TabsTrigger>
        ) : null}
      </TabsList>
      <TabsContent value="readme">
        <ReadmeTab
          loading={readme.loading}
          error={readme.error}
          content={readme.content}
          version={selectedVersion}
          onRetry={readme.onRetry}
        />
      </TabsContent>
      <TabsContent value="versions">
        <VersionsTab
          packageName={packageName}
          versions={versions}
          selectedVersion={selectedVersion}
          onSelectVersion={onSelectVersion}
          onDownload={onDownload}
        />
      </TabsContent>
      <TabsContent value="certs">
        <CertsTab
          versions={versions}
          selectedVersion={selectedVersion}
          onSelectVersion={onSelectVersion}
          certifications={certificationsForVersion(detail, selectedVersion)}
        />
      </TabsContent>
      {canEdit ? (
        <TabsContent value="config">
          <ConfigTab
            packageName={packageName}
            detail={detail}
            onSaved={onDetailRefetch}
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

import { useState } from 'react';
import { Button, Select } from 'antd';
import { QuarkTheme, TIER_META } from '@quarks.studio/web-ui';
import { CERTIFICATION_TIERS } from '@quarks.studio/certification';
import { ConfiguredMonthlyTotals } from '@quarks.studio/commerce/web';

import {
  highestVersion,
  sortVersions,
  type PackageDetails,
} from '../../index';

export interface SubscriptionsTabProps {
  detail: PackageDetails;
  selectedVersion?: string;
}

/**
 * The package's subscriptions panel: launch a certification run for a version
 * and tier, and review the subscriptions that fund those runs.
 */
export function SubscriptionsTab({
  detail,
  selectedVersion,
}: SubscriptionsTabProps) {
  const versions = sortVersions(detail.versions ?? []);
  const initialVersion =
    (selectedVersion && versions.some((v) => v.version === selectedVersion)
      ? selectedVersion
      : undefined) ??
    highestVersion(versions)?.version ??
    '';
  const [version, setVersion] = useState(initialVersion);
  const [tier, setTier] = useState('');
  const canRun = version !== '' && tier !== '';

  return (
    <QuarkTheme>
      <div className="space-y-8" data-testid="subscriptions-tab">
        <section aria-label="Ejecuciones">
          <h3 className="!mb-2 text-base font-semibold">Ejecuciones</h3>
          <p className="mb-3 text-sm text-slate-500">
            Ejecuta la certificación de una versión en el tier que elijas.
          </p>
          <div className="flex max-w-xl flex-wrap items-center gap-2">
            <Select
              aria-label="Versión"
              placeholder="Versión"
              value={version || undefined}
              onChange={setVersion}
              options={versions.map((item) => ({
                value: item.version,
                label: item.version,
              }))}
              style={{ minWidth: 140 }}
            />
            <Select
              aria-label="Test Tier"
              placeholder="Test Tier"
              value={tier || undefined}
              onChange={setTier}
              options={CERTIFICATION_TIERS.map((value) => ({
                value,
                label: TIER_META[value]?.title ?? value,
              }))}
              style={{ minWidth: 240 }}
            />
            <Button
              type="primary"
              disabled={!canRun}
              data-testid="run-certification"
            >
              Run
            </Button>
          </div>
          {/*
            TODO: conectar POST /v1/certifications/{packageId}/{versionId}/{productId}/run
            (patrón en packages/tester/src/lib/server-client.ts). El productId aún
            está por definir.
          */}
        </section>

        <section aria-label="Suscripciones">
          <ConfiguredMonthlyTotals />
        </section>
      </div>
    </QuarkTheme>
  );
}

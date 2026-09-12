import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import type { CertificationTier } from '@quark/tester';
import {
  publishPackage,
  VerificationFailure,
  type PublishResult,
  type PublishProgress,
} from '../index';

import { EXIT_CODES } from '@quark/ui/CLI';
import { Result, Screen, StepList, type WorkflowStep } from '@quark/ui/CLI';

interface PublishScreenProps {
  sourceDir?: string;
  tier?: CertificationTier;
  outputDir?: string;
  token?: string;
  upload?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

export function PublishScreen({
  sourceDir = process.cwd(),
  tier: tierRequested = 'TIER_1' as CertificationTier,
  outputDir,
  token,
  upload = true,
  dryRun = false,
  json = false,
}: PublishScreenProps) {
  const { exit } = useApp();
  const started = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);

  const [currentSteps, setCurrentSteps] = useState<WorkflowStep[]>([
    { id: 'validate', label: 'Validate path and manifest', status: 'pending' },
    { id: 'verify', label: 'Run local verification', status: 'pending' },
    { id: 'pack', label: 'Pack archive', status: 'pending' },
    { id: 'upload', label: 'Upload to registry', status: 'pending' },
  ]);

  const updateStep = ({ stage, status, detail }: PublishProgress) => {
    setCurrentSteps((prev) =>
      prev.map((step) =>
        step.id === stage ? { ...step, status, detail } : step,
      ),
    );
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void publishPackage(
      { sourceDir, tier: tierRequested, outputDir, token, upload, dryRun },
      updateStep,
    ).then(
      (value) => {
        setResult(value);
        exit();
      },
      (reason) => {
        setError(reason instanceof Error ? reason : new Error(String(reason)));
        process.exitCode =
          reason instanceof VerificationFailure
            ? EXIT_CODES.verificationFailure
            : EXIT_CODES.genericFailure;
        exit();
      },
    );
  }, [sourceDir, tierRequested, outputDir, token, upload, dryRun, exit]);

  if (json && result) {
    return <Text>{JSON.stringify(result)}</Text>;
  }

  if (error) {
    return (
      <Screen title="Publish">
        <StepList steps={currentSteps} />
        <Result success={false} message={error.message} />
      </Screen>
    );
  }

  if (!result) {
    return (
      <Screen title="Publish" subtitle={sourceDir}>
        <StepList steps={currentSteps} />
      </Screen>
    );
  }

  return (
    <Screen title="Publish" subtitle={sourceDir}>
      <StepList steps={currentSteps} />
      <Box marginTop={1}>
        <Result
          success={true}
          message={`${result.packageName}@${result.version} — ${result.uploaded ? 'uploaded' : 'packaged (dry run)'}`}
          detail={result.archive}
        />
      </Box>
    </Screen>
  );
}

import React, { useEffect } from 'react';
import { useApp } from 'ink';
import { verifySkillCache, type CacheVerificationResult } from '../index';
import { EXIT_CODES } from '@quark/ui/CLI';
import { Result, Screen, StatusLine } from '@quark/ui/CLI';

interface CacheVerifyScreenProps {
  json?: boolean;
}

export function CacheVerifyScreen({ json }: CacheVerifyScreenProps) {
  const { exit } = useApp();
  const [result, setResult] = React.useState<CacheVerificationResult | null>(
    null,
  );
  const [error, setError] = React.useState<Error | null>(null);

  useEffect(() => {
    void verifySkillCache().then(
      (res) => {
        setResult(res);
        if (res.invalid.length)
          process.exitCode = EXIT_CODES.verificationFailure;
        exit();
      },
      (reason) => {
        setError(reason instanceof Error ? reason : new Error(String(reason)));
        process.exitCode = EXIT_CODES.genericFailure;
        exit();
      },
    );
  }, [exit]);

  if (error) {
    return (
      <Screen title="Cache Verify">
        <Result success={false} message={error.message} />
      </Screen>
    );
  }

  if (!result) {
    return (
      <Screen title="Cache Verify">
        <StatusLine status="running" message="Verifying cache..." />
      </Screen>
    );
  }

  if (json) {
    return (
      <Screen title="Cache Verify">
        <StatusLine status="success" message={JSON.stringify(result)} />
      </Screen>
    );
  }

  return (
    <Screen title="Cache Verify">
      <StatusLine
        status="success"
        message={`${result.valid.length} valid`}
        detail={`${result.invalid.length} invalid`}
      />
      {result.invalid.length > 0 && (
        <StatusLine status="error" message="Invalid artifacts found" />
      )}
      <Result
        success={result.invalid.length === 0}
        message={
          result.invalid.length === 0
            ? 'All artifacts are valid'
            : `${result.invalid.length} artifact(s) failed verification`
        }
      />
    </Screen>
  );
}

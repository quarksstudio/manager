import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp } from 'ink';

import { EXIT_CODES } from '@quark/ui/CLI';
import { runLocalTests, type TestOptions, type TestResult } from '../index';
import { Result, Screen, StatusLine } from '@quark/ui/CLI';

interface TestScreenProps extends TestOptions {
  json?: boolean;
}

export function TestScreen({ json = false, ...options }: TestScreenProps) {
  const { exit } = useApp();
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const runnerOptions = useMemo(
    () => options,
    [options.targetDir, options.tier, options.seed, options.isolated],
  );

  useEffect(() => {
    void runLocalTests(runnerOptions).then(
      (value) => {
        setResult(value);
        if (!value.passed) process.exitCode = EXIT_CODES.verificationFailure;
        exit();
      },
      (reason: unknown) => {
        const failure =
          reason instanceof Error ? reason : new Error(String(reason));
        setError(failure);
        process.exitCode = EXIT_CODES.invalidArguments;
        exit();
      },
    );
  }, [exit, runnerOptions]);

  if (json && result) {
    return <Text>{JSON.stringify(result)}</Text>;
  }
  if (error) {
    return (
      <Screen title="Quark test">
        <Result success={false} message={error.message} />
      </Screen>
    );
  }

  if (!result) {
    return (
      <Screen title="Quark test">
        <StatusLine status="running" message="Ejecutando tester local..." />
      </Screen>
    );
  }

  return (
    <Screen title="Quark test" subtitle={result.targetDir}>
      <StatusLine
        status={result.passed ? 'success' : 'error'}
        message={`${result.packageName}@${result.version}`}
        detail={`${result.packageType}, ${result.tierAchieved}/${result.tierRequested}`}
      />
      <Box flexDirection="column" marginTop={1}>
        <Text>Hash: {result.sha256Hash || 'n/a'}</Text>
        <Text>Duración: {result.durationMs} ms</Text>
        <Text>
          Cobertura: schema {result.coverage.schemaCoverage}% · assertions{' '}
          {result.coverage.assertionCoverage}% · invariants{' '}
          {result.coverage.invariantCoverage}%
        </Text>
        {result.errors.map((item) => (
          <Text color="red" key={item}>
            Error: {item}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Result
          success={result.passed}
          message={
            result.passed ? 'Verificación exitosa' : 'Verificación fallida'
          }
        />
      </Box>
    </Screen>
  );
}

export default TestScreen;

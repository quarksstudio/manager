import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import {
  useAuthLogin,
  type AuthProvider,
  type AuthStep,
  type LoginStrategy,
} from '../index';
import { EXIT_CODES } from '@quark/ui/CLI';
import { Panel, Screen, Select, StatusLine } from '@quark/ui/CLI';

const STATUS: Record<AuthStep, string> = {
  idle: 'Waiting to start login...',
  'selecting-provider': 'Preparing provider...',
  'opening-browser': 'Opening browser...',
  'waiting-for-code': 'Waiting for authentication code...',
  'waiting-for-redirect': 'Waiting for browser response...',
  'exchanging-token': 'Validating session...',
  authenticated: 'Authentication completed!',
};

export interface LoginScreenProps {
  provider?: string;
  strategy?: LoginStrategy;
  localServerPort?: number;
}

const PROVIDERS: AuthProvider[] = ['google', 'github', 'twitter', 'facebook'];

export function LoginScreen({
  provider,
  strategy,
  localServerPort,
}: LoginScreenProps) {
  const { exit } = useApp();
  const { login, submitManualCode, currentStep, error } = useAuthLogin();
  const [code, setCode] = useState('');
  const initialProvider = PROVIDERS.includes(provider as AuthProvider)
    ? (provider as AuthProvider)
    : null;
  const [selectedProvider, setSelectedProvider] = useState<AuthProvider | null>(
    initialProvider,
  );
  const [providerIndex, setProviderIndex] = useState(0);

  useEffect(() => {
    if (!selectedProvider) return;
    void login({ provider: selectedProvider, strategy, localServerPort }).then(
      () => exit(),
      () => {
        process.exitCode = EXIT_CODES.authentication;
        exit();
      },
    );
  }, [exit, localServerPort, login, selectedProvider, strategy]);

  const handleSelect = (value: string) => {
    setSelectedProvider(value as AuthProvider);
  };

  const handleMove = (direction: 'up' | 'down') => {
    setProviderIndex((prev) => {
      if (direction === 'up')
        return prev === 0 ? PROVIDERS.length - 1 : prev - 1;
      return (prev + 1) % PROVIDERS.length;
    });
  };

  useInput(
    (input, key) => {
      if (key.return && code.trim()) {
        void submitManualCode(code);
        setCode('');
      } else if (key.backspace || key.delete)
        setCode((value) => value.slice(0, -1));
      else if (!key.ctrl && !key.meta) setCode((value) => value + input);
    },
    { isActive: currentStep === 'waiting-for-code' },
  );

  const visibleStep: AuthStep = selectedProvider
    ? currentStep
    : 'selecting-provider';

  return (
    <Screen title="Authentication">
      <Panel color="info">
        <StatusLine
          status={
            error
              ? 'error'
              : currentStep === 'authenticated'
                ? 'success'
                : 'running'
          }
          message={error?.message ?? STATUS[visibleStep]}
        />
        {!selectedProvider && (
          <Box marginTop={1}>
            <Select
              options={PROVIDERS.map((p) => ({ label: p, value: p }))}
              selectedIndex={providerIndex}
              onSelect={handleSelect}
              onMove={handleMove}
            />
          </Box>
        )}
        {currentStep === 'waiting-for-code' && (
          <Box marginTop={1}>
            <Text>
              Code: <Text color="yellow">{'•'.repeat(code.length)}</Text>
            </Text>
          </Box>
        )}
      </Panel>
    </Screen>
  );
}

export default LoginScreen;

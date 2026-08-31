import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import {
  useAuthLogin,
  type AuthProvider,
  type AuthStep,
  type LoginStrategy,
} from '@quark/registry';

const STATUS: Record<AuthStep, string> = {
  idle: 'Esperando para iniciar login...',
  'selecting-provider': 'Preparando proveedor...',
  'opening-browser': 'Abriendo navegador...',
  'waiting-for-code': 'Esperando el código de autenticación...',
  'waiting-for-redirect': 'Esperando respuesta del navegador...',
  'exchanging-token': 'Validando sesión...',
  authenticated: '¡Autenticación completada!',
};

export interface LoginProps {
  provider?: string;
  strategy?: LoginStrategy;
  localServerPort?: number;
}

const Login = ({ provider, strategy, localServerPort }: LoginProps) => {
  const { exit } = useApp();
  const { login, submitManualCode, currentStep, error } = useAuthLogin();
  const [code, setCode] = useState('');
  const providers: AuthProvider[] = ['google', 'github', 'twitter', 'facebook'];
  const initialProvider = providers.includes(provider as AuthProvider)
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
      () => undefined,
    );
  }, [exit, localServerPort, login, selectedProvider, strategy]);

  useInput(
    (input, key) => {
      if (!selectedProvider) {
        if (key.upArrow) {
          setProviderIndex((value) =>
            value === 0 ? providers.length - 1 : value - 1,
          );
        } else if (key.downArrow) {
          setProviderIndex((value) => (value + 1) % providers.length);
        } else if (key.return) {
          setSelectedProvider(providers[providerIndex]);
        }
      } else if (key.return && code.trim()) {
        void submitManualCode(code);
        setCode('');
      } else if (key.backspace || key.delete) {
        setCode((value) => value.slice(0, -1));
      } else if (!key.ctrl && !key.meta) {
        setCode((value) => value + input);
      }
    },
    {
      isActive: !selectedProvider || currentStep === 'waiting-for-code',
    },
  );

  const visibleStep: AuthStep = selectedProvider
    ? currentStep
    : 'selecting-provider';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={error ? 'red' : 'blue'}
      padding={1}
    >
      <Text bold color={error ? 'red' : 'blue'}>
        🌐 Proceso de Autenticación
      </Text>
      <Box marginTop={1}>
        <Text>
          Estado:{' '}
          <Text color={error ? 'red' : 'cyan'}>
            {error?.message ?? STATUS[visibleStep]}
          </Text>
        </Text>
      </Box>
      {!selectedProvider &&
        providers.map((item, index) => (
          <Text key={item} color={index === providerIndex ? 'yellow' : 'white'}>
            {index === providerIndex ? '›' : ' '} {item}
          </Text>
        ))}
      {currentStep === 'waiting-for-code' && (
        <Text>
          Código: <Text color="yellow">{'•'.repeat(code.length)}</Text>
        </Text>
      )}
    </Box>
  );
};

export default Login;

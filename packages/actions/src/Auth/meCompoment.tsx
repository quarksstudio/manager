import React from 'react';
import { Box, Text } from 'ink';
import useMe from '../use/Me';

export function Me() {
  const { user, isLoading } = useMe();

  if (isLoading) {
    return (
      <Box paddingLeft={1}>
        <Text color="yellow">⏳ Cargando configuración y perfil...</Text>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box paddingLeft={1}>
        <Text color="red">❌ Error: No se pudo identificar al usuario.</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="green"
      padding={1}
      width={40}
    >
      <Box marginTop={1} flexDirection="column">
        <Text>
          ID: <Text color="cyan">{user.id}</Text>
        </Text>
        <Text>
          User: <Text color="cyan">{user.name}</Text>
        </Text>
      </Box>
    </Box>
  );
}

export default Me;

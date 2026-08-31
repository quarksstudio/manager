import React from 'react';
import { Box, Text } from 'ink';
import useLogout from '../use/Logout';

function Logout() {
  const isLoading = useLogout();

  if (isLoading) {
    return (
      <Box paddingLeft={1}>
        <Text color="yellow">⏳ Cargando configuración y perfil...</Text>
      </Box>
    );
  }

  return (
    <Box paddingLeft={1}>
      <Text color="green">Token eliminado</Text>
    </Box>
  );
}

export default Logout;

import React, { useEffect } from 'react';
import { Text, Box, useApp } from 'ink';
import { useFetchPackage } from '@quark/registry';

interface Props {
  name: string;
}

const InfoPackages: React.FC<Props> = ({ name }) => {
  const { data: item, error, loading } = useFetchPackage(name);
  const { exit } = useApp();

  useEffect(() => {
    if (!loading) exit();
  }, [exit, loading]);

  if (loading) {
    return (
      <Box>
        <Text>Cargando...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Text>Error: {String(error)}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text>Package: {name}</Text>
      <Text>Data: {JSON.stringify(item ?? {})}</Text>
    </Box>
  );
};

export default InfoPackages;

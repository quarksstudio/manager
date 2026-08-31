import React, { useEffect } from 'react';
import { Text, Box, useApp } from 'ink';
import useConfig from '../use/Config';

const ListCompoment = () => {
  const { config, loading } = useConfig();
  const { exit } = useApp();

  if (loading) {
    return <Text>Cargando..,</Text>;
  }

  useEffect(() => {
    if (!loading) {
      exit();
    }
  }, [loading]);

  return (
    <Box>
      {Object.entries(config).map(([item, value], index) => (
        <Text key={index}>
          {item} = {value}
        </Text>
      ))}
    </Box>
  );
};

export default ListCompoment;

import React, { useEffect } from 'react';
import { Text, Box, useApp } from 'ink';
import useConfig from '../use/Config';

const GetCompoment = ({ key = '' }) => {
  const { loading, config } = useConfig();
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
      <Text>
        {key} = {config[key]}
      </Text>
    </Box>
  );
};

export default GetCompoment;

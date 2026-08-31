import React, { useEffect } from 'react';
import { Text, Box, useApp } from 'ink';
import useConfig from '../use/Config';

const SetCompoment = ({
  key = '',
  value = '',
}: {
  key?: string;
  value?: string;
}) => {
  const { loading, updateConfig } = useConfig();
  const { exit } = useApp();

  if (loading) {
    return <Text>Cargando..,</Text>;
  }

  useEffect(() => {
    if (!loading) {
      updateConfig({ [key]: value }).finally(() => exit());
    }
  }, [loading]);

  return (
    <Box>
      <Text>
        {key} = {value}
      </Text>
    </Box>
  );
};

export default SetCompoment;

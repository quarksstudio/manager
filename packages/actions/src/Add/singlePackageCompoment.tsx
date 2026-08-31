import React, { useEffect } from 'react';
import { Text, Box } from 'ink';

import useInstaller from '../use/Installer';

interface Props {
  packageName: string;
  where: string;
  models: string[];
  onFinish: (value: any) => any;
}

const SinglePackage: React.FC<Props> = ({
  packageName,
  where,
  models,
  onFinish,
}) => {
  const { install, status, progress } = useInstaller();

  useEffect(() => {
    install(packageName, where).then(onFinish);
  }, [packageName, where, models]);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
    >
      <Box>
        <Text>
          {status}:{progress}
        </Text>
      </Box>

      {status === 'error' && (
        <Box marginTop={1}>
          <Text color="red">Error: {progress}</Text>
        </Box>
      )}
    </Box>
  );
};

export default SinglePackage;

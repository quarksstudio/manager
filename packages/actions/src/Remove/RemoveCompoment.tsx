import React, { useEffect } from 'react';
import { Text, Box, useApp } from 'ink';
import useSkill from '../use/Skill';
import useInstaller from '../use/Installer';

interface Props {
  packageName: string;
  where: string;
  onConfigChange?: () => void;
}

const RemovePackage: React.FC<Props> = ({ packageName, where }) => {
  const { uninstall } = useInstaller();
  const { deletePackage, error, loading, getPackage } = useSkill(where);
  const { exit } = useApp();

  useEffect(() => {
    const name = getPackage(packageName);
    if (!loading && name) {
      uninstall(packageName, where)
        .then(() => deletePackage(packageName))
        .finally(() => exit());
    }
  }, [loading, packageName, where, deletePackage]);

  if (loading) {
    return <Text color="yellow">Buscando paquete para eliminar...</Text>;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="red"
      paddingX={1}
    >
      {error ? (
        <Text color="red">❌ Error: {error}</Text>
      ) : (
        <Box>
          <Text>Paquete </Text>
          <Text color="cyan" bold>
            {packageName}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default RemovePackage;

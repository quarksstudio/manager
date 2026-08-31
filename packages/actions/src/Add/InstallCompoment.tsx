import React, { useCallback, useState } from 'react';
import { Text, Box, useApp } from 'ink';

import useSkill from '../use/Skill';
import SinglePackage from './singlePackageCompoment';

interface Props {
  where: string;
  models: string[];
  isSave: boolean;
  onFinish: (version: string) => void;
}

const InstallPackages: React.FC<Props> = ({ where, models }) => {
  const { loading, packages } = useSkill(where);
  const [count, setCount] = useState(0);
  const { exit } = useApp();

  const handleFinish = useCallback(
    async (packageName: string, version: string) => {
      setCount(count + 1);

      if (count === packages.length - 1) {
        exit();
      }
    },
    [count, packages],
  );

  if (loading) {
    return (
      <Box>
        <Text>Leyendo...</Text>
      </Box>
    );
  }

  return (
    <>
      {packages.map(([packageName, version], index) => (
        <SinglePackage
          key={index}
          packageName={`${packageName}@${version}`}
          where={where}
          models={models}
          onFinish={(version: string) => handleFinish(packageName, version)}
        />
      ))}
    </>
  );
};

export default InstallPackages;

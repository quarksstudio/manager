import React, { useCallback, useState } from 'react';
import { Text, Box, useApp } from 'ink';

import useSkill from '../use/Skill';
import SinglePackage from './singlePackageCompoment';

interface Props {
  packageName: string[];
  where: string;
  models: string[];
  isSave: boolean;
  onFinish: (version: string) => void;
}

const AddPackages: React.FC<Props> = ({
  packageName: packageNames = [],
  where,
  models,
  isSave,
}) => {
  const { updatePackage, loading } = useSkill(where);
  const [count, setCount] = useState(0);
  const { exit } = useApp();

  const handleFinish = useCallback(
    async (packageName: string, version: string) => {
      setCount(count + 1);

      if (isSave) {
        updatePackage(packageName, version);
      }

      if (count === packageNames.length - 1) {
        exit();
      }
    },
    [updatePackage, count, packageNames],
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
      {packageNames.map((packageName, index) => (
        <SinglePackage
          key={index}
          packageName={packageName}
          where={where}
          models={models}
          onFinish={(version: string) => handleFinish(packageName, version)}
        />
      ))}
    </>
  );
};

export default AddPackages;

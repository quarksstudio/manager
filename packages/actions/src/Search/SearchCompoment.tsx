import React, { useEffect } from 'react';
import { Text, Box, Newline, useApp } from 'ink';
import { useSearchPackages } from '@quark/registry';

interface Props {
  query: string;
}

const SearchPackage: React.FC<Props> = ({ query }) => {
  const { combinedResults: items, isSearchingRemote } = useSearchPackages({
    query,
  });
  const { exit } = useApp();

  useEffect(() => {
    if (!isSearchingRemote) exit();
  }, [exit, isSearchingRemote]);

  if (isSearchingRemote && items.length === 0)
    return <Text color="yellow">Cargando...</Text>;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text>Resultados para: </Text>
        <Text color="magenta" bold>
          "{query}"
        </Text>
      </Box>

      {items.length === 0 ? (
        <Text color="gray italic">
          No se encontraron paquetes que coincidan.
        </Text>
      ) : (
        items.map((item) => (
          <Box key={item.name}>
            <Text color="cyan"> • {item.name.padEnd(20)}</Text>
            <Text color="yellow">{item.version}</Text>
          </Box>
        ))
      )}

      <Newline />
      <Text>Total: {items.length} paquete(s) encontrado(s).</Text>
    </Box>
  );
};

export default SearchPackage;

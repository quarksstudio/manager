import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

import { useState, useCallback, useEffect, useMemo } from 'react';

type PackageMap = Map<string, string>;

const useSkill = (pathProject: string) => {
  const [packages, setPackages] = useState<PackageMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filePath = useMemo(
    () => join(pathProject, '.skillLock'),
    [pathProject],
  );

  // Auxiliar para persistir el Map al archivo
  const saveToDisk = (map: PackageMap) => {
    const content = Array.from(map.entries())
      .map(([name, version]) => `${name}@${version}`)
      .join('\n');
    writeFileSync(filePath, content, 'utf-8');
  };

  // 1. Cargar datos
  const loadPackages = useCallback(() => {
    setLoading(true);
    setError(null);
    setPackages(new Map());

    try {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf-8');
        const newMap: PackageMap = new Map(
          content.split('\n').reduce<[string, string][]>((acc, line) => {
            const trimmed = line.trim();
            if (trimmed && trimmed.includes('@')) {
              const index = trimmed.lastIndexOf('@');
              const name = trimmed.slice(0, index);
              const version = trimmed.slice(index + 1);
              acc.push([name, version]);
            }

            return acc;
          }, []),
        );

        setPackages(newMap);
      }
    } catch (err: any) {
      setError(`Error de lectura: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [pathProject]);

  useEffect(() => {
    loadPackages();
  }, [pathProject]);

  const updatePackage = useCallback(
    (name: string, version: string) => {
      try {
        setPackages((prev) => {
          const next = new Map(prev); // Clonar para inmutabilidad de React
          next.set(name, version); // Si existe lo pisa, si no lo crea
          saveToDisk(next);
          return next;
        });
        setError(null);
      } catch (err: any) {
        setError(`Error al actualizar: ${err.message}`);
      }
    },
    [filePath],
  );

  const deletePackage = useCallback(
    (name: string) => {
      try {
        setPackages((prev) => {
          const next = new Map(prev);
          const ver = next.get(name);
          if (next.delete(name)) {
            saveToDisk(next);
          }
          return next;
        });
        setError(null);
      } catch (err: any) {
        setError(`Error al eliminar: ${err.message}`);
      }
    },
    [filePath],
  );

  const getPackage = useCallback(
    (packageName: string) => {
      const version = packages.get(packageName);
      return `${packageName}@${version}`;
    },
    [packages],
  );

  return {
    packages: Array.from(packages.entries()), // Convertir a array para iterar en Ink
    loading,
    error,
    loadPackages,
    updatePackage,
    deletePackage,
    getPackage,
  };
};

export default useSkill;

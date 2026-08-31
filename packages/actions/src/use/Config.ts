import { useState, useEffect, useCallback } from 'react';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import * as INI from 'ini';

import { createStorage } from '@quark/use-storage';

type AppConfig = Record<string, string | string[] | undefined | boolean>;

const CONFIG_DIR = join(homedir(), '.config', 'quark');
const CONFIG_FILE = join(CONFIG_DIR, 'config.ini');
const authStorage = createStorage({ namespace: 'app' });

const useConfig = () => {
  const [config, setConfig] = useState<AppConfig>({
    token: '',
    log: 'info',
    colors: true,
    editor: 'nano',
    ias: [],
  });
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
        const initial = INI.stringify({
          token: '',
          log: 'info',
          colors: true,
          editor: 'nano',
          ias: ['gpt-4o', 'claude-3-opus'],
        });
        writeFileSync(CONFIG_FILE, initial, 'utf-8');
      }

      const raw = readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = INI.parse(raw);
      const legacyToken = String(parsed['token'] ?? '');
      if (legacyToken) {
        await authStorage.setItem('auth:session', {
          accessToken: legacyToken,
        });
        delete parsed['token'];
        await writeFile(CONFIG_FILE, INI.stringify(parsed), 'utf-8');
      }

      setConfig({
        ...parsed,
        token: '',
        colors: String(parsed['colors']) !== 'false',
        ias: Array.isArray(parsed['ias'])
          ? parsed['ias']
          : parsed['ias']
            ? [parsed['ias']]
            : [],
      });
    } catch (err) {
      console.error('Error inicializando configuración:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(
    async (changes: Partial<AppConfig>) => {
      const token = changes['token'];
      if (typeof token === 'string') {
        if (token) {
          await authStorage.setItem('auth:session', { accessToken: token });
        } else {
          await authStorage.removeItem('auth:session');
        }
      }

      const persistedChanges = { ...changes };
      delete persistedChanges['token'];
      const newConfig = { ...config, ...persistedChanges, token: '' };
      const persistedConfig: AppConfig = { ...newConfig };
      delete persistedConfig['token'];

      // Aseguramos que el directorio exista antes de cada escritura por seguridad
      if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
      }

      await writeFile(CONFIG_FILE, INI.stringify(persistedConfig), 'utf-8');
      setConfig(newConfig);
    },
    [config],
  );

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  return { config, loading, updateConfig, filePath: CONFIG_FILE };
};

export default useConfig;

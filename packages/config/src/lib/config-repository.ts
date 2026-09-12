import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

import * as INI from 'ini';

import { createStorage } from '@quark/use-storage';

import {
  DEFAULT_AI_MODELS,
  DEFAULT_CONFIG,
  type AppConfig,
} from '../domain/config';

export const CONFIG_DIR = join(homedir(), '.config', 'quark');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.ini');

const AUTH_SESSION_KEY = 'auth:session';

const authStorage = createStorage({ namespace: 'app' });

export interface LoadedConfig {
  config: AppConfig;
  filePath: string;
}

function normalizeConfig(parsed: Record<string, unknown>): AppConfig {
  return {
    ...parsed,
    token: '',
    colors: String(parsed['colors']) !== 'false',
    ias: Array.isArray(parsed['ias'])
      ? parsed['ias']
      : parsed['ias']
        ? [parsed['ias']]
        : [],
  };
}

export async function loadConfig(): Promise<LoadedConfig> {
  if (!existsSync(CONFIG_FILE)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    const initial = INI.stringify({
      ...DEFAULT_CONFIG,
      ias: DEFAULT_AI_MODELS,
    });
    writeFileSync(CONFIG_FILE, initial, 'utf-8');
  }

  const raw = readFileSync(CONFIG_FILE, 'utf-8');
  const parsed = INI.parse(raw);
  const legacyToken = String(parsed['token'] ?? '');
  if (legacyToken) {
    await authStorage.setItem(AUTH_SESSION_KEY, {
      accessToken: legacyToken,
    });
    delete parsed['token'];
    await writeFile(CONFIG_FILE, INI.stringify(parsed), 'utf-8');
  }

  return { config: normalizeConfig(parsed), filePath: CONFIG_FILE };
}

export async function writeConfig(
  changes: Partial<AppConfig>,
): Promise<AppConfig> {
  const current = await loadConfig();

  const token = changes['token'];
  if (typeof token === 'string') {
    if (token) {
      await authStorage.setItem(AUTH_SESSION_KEY, { accessToken: token });
    } else {
      await authStorage.removeItem(AUTH_SESSION_KEY);
    }
  }

  const persistedChanges = { ...changes };
  delete persistedChanges['token'];
  const newConfig = { ...current.config, ...persistedChanges, token: '' };
  const persistedConfig: AppConfig = { ...newConfig };
  delete persistedConfig['token'];

  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  await writeFile(CONFIG_FILE, INI.stringify(persistedConfig), 'utf-8');
  return newConfig;
}

import { createStorage } from '@quarks.studio/use-storage';
import { configureRegistry } from '@quarks.studio/registry';
import { loadConfig } from '@quarks.studio/config';
import {
  getLogLevel,
  logLevelFromArgv,
  logger,
  resolveLogLevel,
  setLogLevel,
} from '@quarks.studio/logger';

export async function bootstrapEnv(): Promise<void> {
  if (process.env['QUARK_REGISTRY_API_URL'])
    configureRegistry(process.env['QUARK_REGISTRY_API_URL']);
  if (
    process.env['QUARK_ENV'] === 'local' &&
    process.env['MANAGER_SERVER_TOKEN']
  ) {
    await createStorage({ namespace: 'app' }).setItem('auth:session', {
      accessToken: process.env['MANAGER_SERVER_TOKEN'],
    });
  }
}

export async function setupLogging(): Promise<void> {
  const loadedConfig = await loadConfig();
  setLogLevel(
    resolveLogLevel([
      logLevelFromArgv(process.argv.slice(2)),
      process.env['QUARK_LOG_LEVEL'],
      typeof loadedConfig.config['log'] === 'string'
        ? loadedConfig.config['log']
        : undefined,
    ]),
  );
  logger.verbose(`quark ${process.argv.slice(2).join(' ')}`);
  logger.silly(`log level: ${getLogLevel()}`);
}

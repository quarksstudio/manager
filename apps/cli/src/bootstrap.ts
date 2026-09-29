import { loadConfig, type LoadedConfig } from '@quarks.studio/config';
import {
  getLogLevel,
  logLevelFromArgv,
  logger,
  resolveLogLevel,
  setLogLevel,
} from '@quarks.studio/logger';

/** Load every setting the CLI needs: endpoint, token, and log verbosity. */
export async function bootstrapEnv(): Promise<LoadedConfig> {
  const loaded = await loadConfig();
  setLogLevel(
    resolveLogLevel([
      logLevelFromArgv(process.argv.slice(2)),
      loaded.config.log,
    ]),
  );
  logger.verbose(`quark ${process.argv.slice(2).join(' ')}`);
  logger.silly(`log level: ${getLogLevel()}`);
  return loaded;
}

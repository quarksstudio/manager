export {
  DEFAULT_CONFIG,
  DEFAULT_AI_MODELS,
  type AppConfig,
} from './domain/config';
export {
  CONFIG_DIR,
  CONFIG_FILE,
  loadConfig,
  writeConfig,
  type LoadedConfig,
} from './lib/config-repository';
export { useConfig, default, type UseConfigReturn } from './hooks';

export type AppConfig = Record<string, string | string[] | undefined | boolean>;

export const DEFAULT_CONFIG: AppConfig = {
  token: '',
  log: 'info',
  colors: true,
  editor: 'nano',
  ias: [],
};

export const DEFAULT_AI_MODELS = ['gpt-4o', 'claude-3-opus'];

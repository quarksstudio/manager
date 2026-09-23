export type AppConfig = Record<string, string | string[] | undefined | boolean>;

export const DEFAULT_CONFIG: AppConfig = {
  token: '',
  log: 'silent',
  colors: true,
  editor: 'nano',
  ias: [],
  api: "https://api.quarks.studio/v1"
};

export const DEFAULT_AI_MODELS = ['gpt-4o', 'claude-3-opus'];
